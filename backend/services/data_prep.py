import pandas as pd
import numpy as np
import sqlite3

def carregar_bases_reais(db_path: str = 'simulador.db'):
    print("\n[SIMULAÇÃO] Conectando ao SQLite...")
    conn = sqlite3.connect(db_path)
    
    # A MÁGICA DA OTIMIZAÇÃO:
    # Usamos o 'rowid DESC' do SQLite para capturar as leituras mais recentes instantaneamente.
    # 600.000 linhas costumam cobrir confortavelmente as últimas semanas sem estourar a RAM.
    print("[SIMULAÇÃO] Lendo tabela Knapp (Apenas histórico recente)...")
    query_knapp = """
        SELECT uc, ponto_decisao, mensagem, dt_hora 
        FROM knapp 
        ORDER BY rowid DESC 
        LIMIT 600000
    """
    df_knapp = pd.read_sql_query(query_knapp, conn)
    
    # Voltamos a inverter a tabela para que fique na ordem cronológica normal (do mais antigo para o mais recente)
    df_knapp = df_knapp.iloc[::-1].reset_index(drop=True)
    
    print("[SIMULAÇÃO] Lendo tabela Tarefas...")
    df_tarefas = pd.read_sql_query("SELECT uc, qtd, tp_atendimento, estacao, peso, catergoria_material FROM tarefas", conn)
    
    print("[SIMULAÇÃO] Lendo Dicionário...")
    df_dic = pd.read_sql_query("SELECT * FROM dicionario", conn)
    conn.close()

    print("[SIMULAÇÃO] Aplicando blindagem extrema de UCs...")
    def higienizar_uc(col):
        return col.astype(str).str.replace(r'\.0$', '', regex=True).str.replace(r'[^A-Za-z0-9]', '', regex=True).str.upper().str.lstrip('0')

    df_knapp['uc'] = higienizar_uc(df_knapp['uc'])
    df_tarefas['uc'] = higienizar_uc(df_tarefas['uc'])

    print("[SIMULAÇÃO] Formatando datas...")
    try:
        df_knapp['dt_hora_real'] = pd.to_datetime(df_knapp['dt_hora'], format='%d/%m/%Y %H:%M:%S', errors='coerce')
    except:
        df_knapp['dt_hora_real'] = pd.to_datetime(df_knapp['dt_hora'].astype(float), unit='s', errors='coerce')
    df_knapp = df_knapp.dropna(subset=['dt_hora_real'])

    print("[SIMULAÇÃO] Processando matemática da simulação...")
    # ... MANTER TODO O RESTANTE DO SEU CÓDIGO INALTERADO A PARTIR DAQUI ...

    # 2. Mapeamento de Estações e Zonas (Fallback)
    fallback_map = {}
    for statio in df_dic['Statio'].unique():
        contexts = df_dic[df_dic['Statio'] == statio]['Contexto'].dropna().tolist()
        if contexts:
            fallback_map[statio] = "M" + "/".join([str(c).replace("M", "").strip() for c in contexts])

    df_knapp['keyword'] = np.where(df_knapp['mensagem'].str.contains('RightBwd1'), 'RightBwd1',
                            np.where(df_knapp['mensagem'].str.contains('RightFwd1'), 'RightFwd1', None))
    
    df_knapp_fisico = df_knapp.merge(df_dic, left_on=['ponto_decisao', 'keyword'], right_on=['Statio', 'Mensagem'], how='left')
    df_knapp_fisico['fallback'] = df_knapp_fisico['ponto_decisao'].map(fallback_map)
    df_knapp_fisico['estacao_real'] = np.where(df_knapp_fisico['Contexto'].notna(), df_knapp_fisico['Contexto'], 
                                     np.where(df_knapp_fisico['fallback'].notna(), df_knapp_fisico['fallback'], df_knapp_fisico['ponto_decisao']))
    df_knapp_fisico['estacao_real'] = df_knapp_fisico['estacao_real'].str.strip()

    # --- CORREÇÃO DO ERRO 'UNHASHABLE SERIES' ---
    # Criamos uma coluna temporária apenas de data para remover duplicadas com segurança
    df_knapp['data_temp'] = df_knapp['dt_hora_real'].dt.date
    df_uc_entry = df_knapp.sort_values('dt_hora_real').drop_duplicates(subset=['uc', 'data_temp'])
    df_uc_entry = df_uc_entry[['uc', 'dt_hora_real']].copy()
    
    # Limpeza das Tarefas
    df_tarefas['qtd'] = pd.to_numeric(df_tarefas['qtd'], errors='coerce').fillna(0).astype(int)
    df_tarefas['tipo_simplificado'] = np.where(df_tarefas['tp_atendimento'].str.contains('Varejo', na=False), 'Varejo', 'Regular')
    df_tarefas['estacao'] = df_tarefas['estacao'].str.strip()

    # Unimos as tarefas com o tempo de entrada da caixa (Garante os volumes de 6k-7k)
    df_picking = df_tarefas.merge(df_uc_entry, on='uc', how='inner')
    df_picking['estacao_real'] = df_picking['estacao']

    # df_throughput: Para contagem de caixas/hora
    df_throughput = df_uc_entry.copy()

    df_uc_tipos = df_tarefas.drop_duplicates('uc')[['uc', 'tipo_simplificado']]
    
    # df_throughput: Agora recebe a informação de tipo para responder aos filtros
    df_throughput = df_uc_entry.merge(df_uc_tipos, on='uc', how='left')
    # Preenchemos como 'Outros' se não encontrar na base de tarefas
    df_throughput['tipo_simplificado'] = df_throughput['tipo_simplificado'].fillna('Outros')

    return df_picking, df_knapp_fisico, df_throughput

def calcular_tempo_entre_estacoes(df_fisico: pd.DataFrame) -> pd.DataFrame:
    df_sorted = df_fisico.sort_values(by=['uc', 'dt_hora_real'])
    def get_rank(st):
        st = str(st).upper()
        if 'LIT' in st: return int(''.join(filter(str.isdigit, st)) or 0)
        if 'M' in st: return int(''.join(filter(str.isdigit, st.split('/')[0])) or 0) + 10
        return 9000
    df_sorted['rank'] = df_sorted['estacao_real'].apply(get_rank)
    df_sorted['est_ant'] = df_sorted.groupby('uc')['estacao_real'].shift(1)
    df_sorted['rank_ant'] = df_sorted.groupby('uc')['rank'].shift(1)
    df_sorted['t_ant'] = df_sorted.groupby('uc')['dt_hora_real'].shift(1)
    df_sorted['lead_time_segundos'] = (df_sorted['dt_hora_real'] - df_sorted['t_ant']).dt.total_seconds()
        
    df_pulos = df_sorted[(df_sorted['lead_time_segundos'] > 0) & 
                            (df_sorted['lead_time_segundos'] < 7200) & 
                            (df_sorted['rank'] >= df_sorted['rank_ant'])].copy()
        
    df_pulos['trecho'] = df_pulos['est_ant'].fillna('?') + " -> " + df_pulos['estacao_real']
    return df_pulos
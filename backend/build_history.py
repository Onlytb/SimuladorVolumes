import sqlite3
import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, 'simulador.db')

def construir_historico_diario(db_path=DEFAULT_DB_PATH):
    print("Conectando ao banco de dados...")
    conn = sqlite3.connect(db_path)

    print("Lendo logs do KNAPP e Tarefas...")
    df_k = pd.read_sql_query("SELECT uc, ponto_decisao, mensagem, dt_hora FROM knapp", conn)
    df_t = pd.read_sql_query("SELECT uc, qtd, tp_atendimento FROM tarefas", conn)

    print("🛠️ Aplicando Limpeza de Nível Avançado nas UCs...")
    def higienizar_uc(col):
        return col.astype(str).str.replace(r'\.0$', '', regex=True).str.replace(r'[^A-Za-z0-9]', '', regex=True).str.upper().str.lstrip('0')

    df_k['uc'] = higienizar_uc(df_k['uc'])
    df_t['uc'] = higienizar_uc(df_t['uc'])
    
    df_t['qtd'] = pd.to_numeric(df_t['qtd'], errors='coerce').fillna(0).astype(int)

    print("Formatando datas...")
    try:
        df_k['dt_hora_real'] = pd.to_datetime(df_k['dt_hora'], format='%d/%m/%Y %H:%M:%S', errors='coerce')
    except:
        df_k['dt_hora_real'] = pd.to_datetime(df_k['dt_hora'].astype(float), unit='s', errors='coerce')
    df_k = df_k.dropna(subset=['dt_hora_real'])


    # =========================================================================
    # NOVA PARTE: CRIAR A TABELA OTIMIZADA PARA A PÁGINA "HISTÓRICO START"
    # =========================================================================
    print("Gerando base otimizada para Histórico Start...")
    # Pega apenas a PRIMEIRA leitura (keep='first') de cada UC na esteira
    df_start = df_k.sort_values('dt_hora_real').drop_duplicates(subset=['uc'], keep='first').copy()
    
    # Extrai a data em formato string puro (YYYY-MM-DD) para buscas instantâneas no SQL
    df_start['data_only'] = df_start['dt_hora_real'].dt.date.astype(str) 
    df_start['hour'] = df_start['dt_hora_real'].dt.hour
    
    df_t_tipo = df_t.copy()
    df_t_tipo['tipo'] = np.where(df_t_tipo['tp_atendimento'].str.contains('Varejo', case=False, na=False), 'Varejo', 'Regular')
    
    # Agrupa tarefas por UC para saber o tipo de caixa e total de peças
    df_t_start_agg = df_t_tipo.groupby('uc').agg(pecas=('qtd', 'sum'), tipo=('tipo', 'first')).reset_index()
    
    # Cruza os dados de início com as propriedades da caixa
    df_inducao = df_start.merge(df_t_start_agg, on='uc', how='inner')
    
    # Salva no SQLite numa tabela super leve
    df_inducao[['uc', 'data_only', 'hour', 'tipo', 'pecas']].to_sql('inducao_start', conn, if_exists='replace', index=False)
    print("Tabela 'inducao_start' criada com sucesso! A página será instantânea agora.")
    # =========================================================================


    print("Processando Caixas GV (K07/K08 + Fwd)...")
    df_k['mensagem'] = df_k['mensagem'].astype(str).str.upper()
    mask_gv = (df_k['ponto_decisao'].str.contains('K07|K08', case=False, na=False)) & \
              (df_k['mensagem'].str.contains('FWD', na=False)) & \
              (~df_k['mensagem'].str.contains('LEFT|RIGHT', na=False))
              
    df_gv = df_k[mask_gv].sort_values('dt_hora_real').drop_duplicates(subset=['uc'], keep='last').copy()
    df_gv['tipo_caixa'] = 'GV'

    print("Processando Caixas Fracionadas (w02)...")
    mask_fr = (df_k['ponto_decisao'].str.contains('w02', case=False, na=False))
    df_fr = df_k[mask_fr].sort_values('dt_hora_real').drop_duplicates(subset=['uc'], keep='last').copy()
    df_fr['tipo_caixa'] = 'FR'

    df_expedicao = pd.concat([df_gv, df_fr])
    df_expedicao['data_exp'] = df_expedicao['dt_hora_real'].dt.date

    df_t_agg = df_t.groupby('uc').agg(pecas_total=('qtd', 'sum')).reset_index()
    df_final = df_expedicao.merge(df_t_agg, on='uc', how='left')
    df_final['pecas_total'] = df_final['pecas_total'].fillna(0)

    df_final['pecas_gv'] = np.where(df_final['tipo_caixa'] == 'GV', df_final['pecas_total'], 0)
    df_final['pecas_fr'] = np.where(df_final['tipo_caixa'] == 'FR', df_final['pecas_total'], 0)

    print("Gerando o Resumo Estatístico Diário para S&OP...")
    resumo = df_final.groupby('data_exp').agg(
        total_caixas_gv=('tipo_caixa', lambda x: (x == 'GV').sum()),
        total_caixas_fr=('tipo_caixa', lambda x: (x == 'FR').sum()),
        total_pecas=('pecas_total', 'sum'),
        total_pecas_gv=('pecas_gv', 'sum'), 
        total_pecas_fr=('pecas_fr', 'sum')  
    ).reset_index()

    resumo['total_caixas'] = resumo['total_caixas_gv'] + resumo['total_caixas_fr']
    resumo['pct_caixas_fr'] = np.where(resumo['total_caixas'] > 0, (resumo['total_caixas_fr'] / resumo['total_caixas']) * 100, 0)
    resumo['pct_pecas_fr'] = np.where(resumo['total_pecas'] > 0, (resumo['total_pecas_fr'] / resumo['total_pecas']) * 100, 0)

    resumo['densidade_fr'] = np.where(resumo['total_caixas_fr'] > 0, resumo['total_pecas_fr'] / resumo['total_caixas_fr'], 0)
    resumo['densidade_gv'] = np.where(resumo['total_caixas_gv'] > 0, resumo['total_pecas_gv'] / resumo['total_caixas_gv'], 0)

    resumo = resumo.round(1)

    print("Salvando inteligência no SQLite...")
    resumo.to_sql('historico_diario', conn, if_exists='replace', index=False)
    conn.close()
    print("Feito! Banco atualizado com sucesso.")

if __name__ == '__main__':
    construir_historico_diario()
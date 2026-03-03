import pandas as pd
import sqlite3
import os

def migrate_to_sqlite():
    # 1. Descobre o caminho absoluto da pasta onde este script python está salvo
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Junta o caminho da pasta com o nome do banco de dados
    db_path = os.path.join(BASE_DIR, 'simulador.db')
    
    # Conecta ao banco (cria o arquivo se não existir)
    conn = sqlite3.connect(db_path)
    
    print("Lendo CSVs (Isso pode levar um minuto com dados reais)...")
    def ler_csv(nome_arquivo):
        # 3. Junta o caminho da pasta com o nome do CSV
        caminho_completo = os.path.join(BASE_DIR, nome_arquivo)
        try:
            d = pd.read_csv(caminho_completo, sep=',', low_memory=False)
            return d if len(d.columns) > 1 else pd.read_csv(caminho_completo, sep=';', low_memory=False)
        except: 
            return pd.read_csv(caminho_completo, sep=';', low_memory=False)

    # 4. Agora chamamos a função passando apenas o nome, e ela resolve o caminho
    df_knapp = ler_csv('Base_KNAPP.csv')
    df_tarefas = ler_csv('Base_tarefas.csv')
    df_dic = ler_csv('Dicionario_KNAPP.csv')
    
    print("Higienizando dados críticos (UCs)...")
    for df in [df_knapp, df_tarefas]:
        if 'uc' in df.columns:
            df['uc'] = df['uc'].astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
            
    df_dic.columns = df_dic.columns.str.strip()
    
    print("Salvando no SQLite...")
    df_knapp.to_sql('knapp', conn, if_exists='replace', index=False)
    df_tarefas.to_sql('tarefas', conn, if_exists='replace', index=False)
    df_dic.to_sql('dicionario', conn, if_exists='replace', index=False)
    
    print("Criando índices de performance...")
    conn.execute('CREATE INDEX idx_knapp_uc ON knapp(uc)')
    conn.execute('CREATE INDEX idx_tarefas_uc ON tarefas(uc)')
    
    conn.close()
    print(f"Migração concluída com sucesso! Arquivo 'simulador.db' criado em:\n{db_path}")

if __name__ == '__main__':
    migrate_to_sqlite()
import sqlite3
import pandas as pd
import os
from fastapi import APIRouter, HTTPException

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'simulador.db')

@router.get("/metrics")
def get_dashboard_metrics():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Busca o dia mais recente (D0) carregado no banco
    query_max = "SELECT MAX(data_only) as max_date FROM inducao_start"
    df_max = pd.read_sql_query(query_max, conn)
    
    if df_max.empty or pd.isna(df_max.iloc[0]['max_date']):
        conn.close()
        raise HTTPException(status_code=500, detail="Sem dados no banco.")
        
    target_date = df_max.iloc[0]['max_date']
    
    # 2. Puxa todas as induções desse dia
    query = f"SELECT hour, tipo, pecas FROM inducao_start WHERE data_only = '{target_date}'"
    df = pd.read_sql_query(query, conn)
    conn.close()

    # Define os turnos
    def get_turno(h):
        if 6 <= h < 14: return 't1'
        elif 14 <= h < 22: return 't2'
        else: return 't3'

    df['turno'] = df['hour'].apply(get_turno)
    
    # 3. Matemática do REGULAR
    df_reg = df[df['tipo'] == 'Regular']
    reg_turnos = df_reg.groupby('turno')['pecas'].sum().to_dict()
    reg_hourly = df_reg.groupby('hour')['pecas'].sum().to_dict()
    
    # 4. Matemática do VAREJO
    df_var = df[df['tipo'] == 'Varejo']
    var_turnos = df_var.groupby('turno')['pecas'].sum().to_dict()
    var_hourly = df_var.groupby('hour')['pecas'].sum().to_dict()

    # Formatação para o Frontend
    def format_turnos(t_dict):
        return {
            "t1": f"{int(t_dict.get('t1', 0)):,}".replace(',', '.'),
            "t2": f"{int(t_dict.get('t2', 0)):,}".replace(',', '.'),
            "t3": f"{int(t_dict.get('t3', 0)):,}".replace(',', '.')
        }

    def format_hourly(h_dict, cap):
        hours = []
        for i in range(24):
            # Começa o gráfico às 06h (Início do Turno 1)
            current_hour = (i + 6) % 24 
            val = int(h_dict.get(current_hour, 0))
            hours.append({
                "hour": f"{current_hour:02d}:00",
                "processado": val,
                "gargalo": cap
            })
        return hours

    # Capacidades da linha (Para a linha tracejada vermelha e o cálculo de Alerta Rho)
    cap_reg = 4200 
    cap_var = 800
    
    max_reg_h = max(reg_hourly.values()) if reg_hourly else 0
    max_var_h = max(var_hourly.values()) if var_hourly else 0

    return {
        "target_date": target_date,
        "regular": {
            "rho": round(max_reg_h / cap_reg, 2) if cap_reg > 0 else 0,
            "turnos": format_turnos(reg_turnos),
            "hourly": format_hourly(reg_hourly, cap_reg)
        },
        "varejo": {
            "rho": round(max_var_h / cap_var, 2) if cap_var > 0 else 0,
            "turnos": format_turnos(var_turnos),
            "hourly": format_hourly(var_hourly, cap_var)
        }
    }
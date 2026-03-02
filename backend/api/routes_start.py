import sqlite3
import pandas as pd
import numpy as np
import os
import math
from datetime import timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'simulador.db')

class StartParams(BaseModel):
    target_date: str
    start_hour: int
    end_hour: int

@router.post("/analyze")
def analyze_start(params: StartParams):
    target_date_str = params.target_date
    target_date_obj = pd.to_datetime(target_date_str).date()
    # Calcula os 90 dias para trás para o filtro SQL
    limit_date_str = (target_date_obj - timedelta(days=90)).strftime('%Y-%m-%d')
    
    # CONEXÃO ULTRA-RÁPIDA: Puxamos APENAS os dias necessários da tabela otimizada
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT uc, data_only, hour, tipo, pecas 
        FROM inducao_start 
        WHERE data_only >= '{limit_date_str}' AND data_only <= '{target_date_str}'
    """
    df_ind = pd.read_sql_query(query, conn)
    conn.close()

    if df_ind.empty:
        raise HTTPException(status_code=500, detail="Sem dados para este período. O histórico não alcança esta data.")

    # Converte de volta para data do Pandas
    df_ind['data_only'] = pd.to_datetime(df_ind['data_only']).dt.date
    
    df_day = df_ind[df_ind['data_only'] == target_date_obj].copy()
    
    if df_day.empty:
        return {"error": f"Nenhuma indução encontrada para o dia exato de {target_date_str}"}

    # 1. CÁLCULO HEIJUNKA (CAIXAS)
    vol_reg_cx = len(df_day[df_day['tipo'] == 'Regular'])
    vol_var_cx = len(df_day[df_day['tipo'] == 'Varejo'])
    
    ratio_reg, ratio_var = 1, 0
    if vol_var_cx > 0:
        ratio_reg = round(vol_reg_cx / vol_var_cx)
        ratio_var = 1
    elif vol_reg_cx == 0 and vol_var_cx > 0:
        ratio_reg, ratio_var = 0, 1

    # 2. ANÁLISE DE IMPACTO DE 90 DIAS
    df_90 = df_ind[df_ind['data_only'] < target_date_obj].copy()
    
    impact_msg = "Dados insuficientes para calcular impacto."
    impact_value = 0
    
    if not df_90.empty:
        # Agrupa por data e hora 
        hourly_stats = df_90.groupby(['data_only', 'hour']).agg(
            total=('uc', 'count'),
            varejo=('tipo', lambda x: (x=='Varejo').sum())
        ).reset_index()
        hourly_stats['pct_var'] = (hourly_stats['varejo'] / hourly_stats['total']) * 100
        hourly_stats = hourly_stats[hourly_stats['total'] > 50]
        
        if len(hourly_stats) > 10:
            m, b = np.polyfit(hourly_stats['pct_var'], hourly_stats['total'], 1)
            impact_10_pct = int(m * 10) 
            impact_value = impact_10_pct
            if impact_10_pct < 0:
                impact_msg = f"Historicamente, a cada 10% de Varejo adicionados, a esteira perde {abs(impact_10_pct)} caixas/hora de vazão."
            else:
                impact_msg = "O Varejo não demonstrou impacto negativo significativo na vazão horária nos últimos 90 dias."

    # 3. GRÁFICOS: REAL VS IDEAL (PEÇAS)
    active_hours = sorted(df_day['hour'].unique())
    num_hours = len(active_hours) or 1
    
    vol_pecas_reg = int(df_day[df_day['tipo'] == 'Regular']['pecas'].sum())
    vol_pecas_var = int(df_day[df_day['tipo'] == 'Varejo']['pecas'].sum())

    ideal_reg_per_hour = int(vol_pecas_reg / num_hours)
    ideal_var_per_hour = int(vol_pecas_var / num_hours)

    chart_data = []
    for h in active_hours:
        df_h = df_day[df_day['hour'] == h]
        real_reg = int(df_h[df_h['tipo'] == 'Regular']['pecas'].sum())
        real_var = int(df_h[df_h['tipo'] == 'Varejo']['pecas'].sum())
        
        chart_data.append({
            "hour": f"{h:02d}:00",
            "real_reg": real_reg,
            "real_var": real_var,
            "real_total": real_reg + real_var,
            "ideal_reg": ideal_reg_per_hour,
            "ideal_var": ideal_var_per_hour,
            "ideal_total": ideal_reg_per_hour + ideal_var_per_hour
        })

    # 4. GRÁFICO DA JANELA CUSTOMIZADA
    custom_chart_data = []
    window_hours = params.end_hour - params.start_hour
    
    if window_hours > 0:
        window_reg_ph = int(vol_pecas_reg / window_hours)
        window_var_ph = int(vol_pecas_var / window_hours)
        
        for h in range(params.start_hour, params.end_hour):
            custom_chart_data.append({
                "hour": f"{h:02d}:00",
                "sim_reg": window_reg_ph,
                "sim_var": window_var_ph,
                "sim_total": window_reg_ph + window_var_ph
            })

    return {
        "heijunka": {
            "ratio_reg": ratio_reg, "ratio_var": ratio_var,
            "total_reg": vol_reg_cx, "total_var": vol_var_cx
        },
        "impact": {"message": impact_msg, "value": impact_value},
        "chart_data": chart_data,
        "custom_window_data": custom_chart_data
    }
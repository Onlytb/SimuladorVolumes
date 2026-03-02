import sqlite3
import pandas as pd
import os
import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'simulador.db')

class ScenarioParams(BaseModel):
    volume_total: int
    pct_fracionado: float
    dias_alvo: int
    headcount: int

def carregar_historico():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM historico_diario", conn)
    conn.close()
    return df

@router.post("/simulate")
def simulate_scenario(params: ScenarioParams):
    try: df_hist = carregar_historico()
    except: raise HTTPException(status_code=500, detail="Banco histórico não encontrado.")

    if df_hist.empty: raise HTTPException(status_code=500, detail="Histórico vazio.")
    if params.volume_total <= 0 or params.dias_alvo <= 0: return {"error": "Volume e dias devem ser > 0."}

    # 1. Metas Diárias
    target_daily_vol = params.volume_total / params.dias_alvo
    target_vol_fr = target_daily_vol * (params.pct_fracionado / 100)
    target_vol_gv = target_daily_vol - target_vol_fr

    # 2. Reality Check (Viabilidade baseada no recorde total histórico)
    max_hist_vol = df_hist['total_pecas'].max()
    stress_index = (target_daily_vol / max_hist_vol) * 100 if max_hist_vol > 0 else 100
    
    status, color = ("Confortável", "emerald") if stress_index <= 60 else ("Desafiador", "amber") if stress_index <= 90 else ("Risco Crítico", "red")

    # 3. Análise de Headcount (A NOVA REGRA: 514 pçs/hora)
    PECAS_POR_HORA = 514
    HORAS_POR_TURNO = 7
    CAPACIDADE_HC_FR = PECAS_POR_HORA * HORAS_POR_TURNO # 3.598 peças por turno
    
    # Quantas pessoas são necessárias APENAS para o Fracionado (por dia/turno)
    # Como 514 já é um dado real, o OEE já está embutido. Usamos a capacidade limpa.
    required_hc_fr = math.ceil(target_vol_fr / CAPACIDADE_HC_FR)
    
    hc_status = "Adequado" if params.headcount >= required_hc_fr else "Insuficiente"
    hc_diff = params.headcount - required_hc_fr
    
    # Capacidade Estimada da equipe fornecida
    estimated_output_fr = params.headcount * CAPACIDADE_HC_FR

    # 4. Buscador de Similaridade (Gêmeo Digital Bi-dimensional)
    df_hist['score_sim'] = (abs(df_hist['total_pecas_fr'] - target_vol_fr) / (target_vol_fr + 1)) + \
                           (abs(df_hist['total_pecas_gv'] - target_vol_gv) / (target_vol_gv + 1))
    
    similares = df_hist.sort_values('score_sim').head(3)
    similar_days = []
    for _, row in similares.iterrows():
        similar_days.append({
            "data": row['data_exp'],
            "vol_total": int(row['total_pecas']),
            "vol_fr": int(row['total_pecas_fr']),
            "vol_gv": int(row['total_pecas_gv']),
            "densidade_fr": round(row['densidade_fr'], 1),
            "densidade_gv": round(row['densidade_gv'], 1)
        })

    # 5. Plano de Distribuição (Heijunka)
    dist_plan = []
    if params.dias_alvo == 1:
        dist_plan.append({"dia": "Dia 1", "volume": params.volume_total, "alvo": target_daily_vol})
    else:
        pesos = [0.8, 1.1, 1.2, 1.0, 0.9][:params.dias_alvo] 
        while len(pesos) < params.dias_alvo: pesos.append(1.0)
        
        fator_correcao = params.dias_alvo / sum(pesos)
        pesos_ajustados = [p * fator_correcao for p in pesos]
        
        vol_acumulado = 0
        for i in range(params.dias_alvo):
            vol_dia = (params.volume_total - vol_acumulado) if i == params.dias_alvo - 1 else int(target_daily_vol * pesos_ajustados[i])
            vol_acumulado += vol_dia
            dist_plan.append({"dia": f"Dia {i+1}", "volume": vol_dia, "alvo": target_daily_vol})

    return {
        "viability": {
            "status": status, "color": color, "stress_index": min(int(stress_index), 100),
            "target_daily": int(target_daily_vol), "historical_max": int(max_hist_vol)
        },
        "capacity": {
            "required_hc": required_hc_fr, "provided_hc": params.headcount,
            "status": hc_status, "diff": hc_diff, "estimated_output": int(estimated_output_fr)
        },
        "similar_days": similar_days,
        "distribution_plan": dist_plan
    }
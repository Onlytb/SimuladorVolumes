import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from services.data_prep import carregar_bases_reais, calcular_tempo_entre_estacoes

router = APIRouter()

_cache = {
    "df_picking": pd.DataFrame(), 
    "df_fisico": pd.DataFrame(), 
    "df_throughput": pd.DataFrame(),
    "last_mtime": 0
}

def calcular_capacidade_real(n_ops, skill):
    """Modelo de Engenharia: Capacidade com Fator de Interferência"""
    STATIONS_COUNT = 25  
    base_rate = 18 * skill 
    densidade = n_ops / STATIONS_COUNT
    interference = 1.0 if densidade <= 1.2 else 1.0 / (1 + 0.15 * (densidade - 1.2)**2)
    capacidade_nominal = n_ops * base_rate * interference
    return round(capacidade_nominal, 1), round(interference * 100, 1)

def get_dados_atualizados():
    db_file = 'simulador.db' # Agora monitoramos o banco de dados
    try: 
        latest_mtime = os.path.getmtime(db_file) if os.path.exists(db_file) else 0
    except: latest_mtime = 0

    if _cache["df_picking"].empty or latest_mtime > _cache["last_mtime"]:
        print("Lendo dados do SQLite (Alta Performance)...")
        try:
            df_p, df_f, df_t = carregar_bases_reais(db_file)
            _cache.update({"df_picking": df_p, "df_fisico": df_f, "df_throughput": df_t, "last_mtime": latest_mtime})
        except Exception as e: print(f"Erro ao carregar SQLite: {e}")
            
    return _cache["df_picking"], _cache["df_fisico"], _cache["df_throughput"]

def formatar_relogio(segundos_totais: float) -> str:
    h = int(segundos_totais // 3600)
    m = int((segundos_totais % 3600) // 60)
    s = int(segundos_totais % 60)
    return f"{h:02d}:{m:02d}:{s:02d}h" if h > 0 else f"{m:02d}:{s:02d}h"

# Classes corrigidas para permitir acesso params.atendimento.regular
class AtendimentoFilter(BaseModel): regular: bool; varejo: bool
class TurnosFilter(BaseModel): t1: bool; t2: bool; t3: bool
class SimulationParams(BaseModel):
    start_date: str; end_date: str; atendimento: AtendimentoFilter; turnos: TurnosFilter; operators: int; skill: float

@router.post("/run")
def run_simulation_endpoint(params: SimulationParams):
    df_p, df_f, df_t = get_dados_atualizados()
    if df_p.empty: raise HTTPException(status_code=500, detail="Base vazia.")

    start_dt = pd.to_datetime(params.start_date)
    end_dt = pd.to_datetime(params.end_date) + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
    
    h_validas = []
    if params.turnos.t1: h_validas.extend(range(6, 14))
    if params.turnos.t2: h_validas.extend(range(14, 22))
    if params.turnos.t3: h_validas.extend([22, 23, 0, 1, 2, 3, 4, 5])

    # 1. Filtro Inicial por Data e Turno
    p_filt = df_p[df_p['dt_hora_real'].between(start_dt, end_dt) & df_p['dt_hora_real'].dt.hour.isin(h_validas)]
    f_filt = df_f[df_f['dt_hora_real'].between(start_dt, end_dt) & df_f['dt_hora_real'].dt.hour.isin(h_validas)]
    t_filt = df_t[df_t['dt_hora_real'].between(start_dt, end_dt) & df_t['dt_hora_real'].dt.hour.isin(h_validas)]

    # 2. Filtro de Atendimento (Aplicado em Picking e Throughput)
    tipos = [t for t, v in zip(['Regular', 'Varejo'], [params.atendimento.regular, params.atendimento.varejo]) if v]
    p_filt = p_filt[p_filt['tipo_simplificado'].isin(tipos)]
    t_filt = t_filt[t_filt['tipo_simplificado'].isin(tipos)]

    if p_filt.empty: return {"error": "Sem dados para o filtro selecionado."}

    # 3. KPIs e Curva de Eficiência Reativa
    horas_ativas = f_filt['dt_hora_real'].dt.floor('h').nunique() or 1
    demanda_periodo_cx_h = t_filt['uc'].nunique() / horas_ativas
    cap_atual, ef_atual = calcular_capacidade_real(params.operators, params.skill)
    avg_throughput = int(min(cap_atual, demanda_periodo_cx_h))

    efficiency_curve = []
    for n in range(5, 61, 5):
        cap, ef = calcular_capacidade_real(n, params.skill)
        efficiency_curve.append({
            "ops": n, 
            "throughput": int(min(cap, demanda_periodo_cx_h * 1.5)), 
            "efficiency": ef,
            "demand": int(demanda_periodo_cx_h)
        })

    # 4. Gargalos Reais
    df_pulos = calcular_tempo_entre_estacoes(f_filt)
    gargalos_reais = []
    if not df_pulos.empty:
        trechos_mediana = df_pulos.groupby('trecho')['lead_time_segundos'].median()
        top_trechos = trechos_mediana.sort_values(ascending=False).head(5)
        max_time = top_trechos.max() or 1
        for trecho, tempo in top_trechos.items():
            gargalos_reais.append({"trecho": trecho, "time": formatar_relogio(tempo), "pct": int((tempo/max_time)*100)})

    # 5. Distribuição e Categorias
    top_cat = p_filt['catergoria_material'].value_counts(normalize=True).head(5) * 100
    categorias_final = [{"cat": str(c).title(), "pct": round(p, 1)} for c, p in top_cat.items()]

    df_dist = p_filt.copy()
    df_dist['corredor'] = df_dist['estacao_real'].str.extract(r'M(\d)')
    dist_corredor = df_dist['corredor'].value_counts(normalize=True) * 100
    distrib_final = []
    total_alloc = 0
    for i in range(1, 6):
        pct = dist_corredor.get(str(i), 0) / 100
        alloc = int(round(pct * params.operators))
        total_alloc += alloc
        distrib_final.append({"id": i, "name": f"Corredor {i}", "pct": round(pct, 3), "allocated": alloc})
    if distrib_final and params.operators > 0 and total_alloc != params.operators:
        distrib_final[0]['allocated'] += (params.operators - total_alloc)

    # 6. Gráfico de Throughput
    chart_data = []
    for h in sorted(h_validas):
        df_h = t_filt[t_filt['dt_hora_real'].dt.hour == h]
        if df_h.empty: continue
        dias = df_h['dt_hora_real'].dt.date.nunique() or 1
        tp = int(df_h['uc'].nunique() / dias)
        util = round(min(tp/cap_atual, 1), 2) if cap_atual > 0 else 0
        chart_data.append({"hour": f"{h:02d}:00", "throughput": tp, "utilization": util})

    # 7. Top Estações
    df_est = p_filt.groupby('estacao_real').agg(pecas=('qtd', 'sum')).reset_index()
    df_est['pecas_hora'] = (df_est['pecas'] / horas_ativas).astype(int)
    estacoes_final = [{"estacao": r['estacao_real'], "pecas_hora": r['pecas_hora']} for _, r in df_est.sort_values('pecas_hora', ascending=False).head(10).iterrows()]

    # 8. Indução
    df_boxes = p_filt.drop_duplicates(subset=['uc']).copy()
    df_boxes['turno'] = df_boxes['dt_hora_real'].dt.hour.apply(lambda h: 'T1' if 6<=h<14 else ('T2' if 14<=h<22 else 'T3'))
    induction_data = []
    for t in ['T1', 'T2', 'T3']:
        df_t = df_boxes[df_boxes['turno'] == t]
        if not df_t.empty:
            induction_data.append({
                "turno": t, "total": len(df_t), "cadence": round(len(df_t)/(df_t['dt_hora_real'].dt.floor('h').nunique()*60 or 1), 1),
                "regularPct": round((len(df_t[df_t['tipo_simplificado'] == 'Regular'])/len(df_t))*100, 1),
                "varejoPct": round((len(df_t[df_t['tipo_simplificado'] == 'Varejo'])/len(df_t))*100, 1)
            })

    return {
        "kpis": {
            "avgThroughput": avg_throughput,
            "totalPecas": int(p_filt['qtd'].sum() / horas_ativas),
            "tempoSistema": formatar_relogio((12 + (100 - ef_atual)*0.2) * 60),
            "avgUtilization": int(ef_atual)
        },
        "efficiencyCurve": efficiency_curve,
        "gargalos": gargalos_reais,
        "distribuicao": distrib_final,
        "categorias": categorias_final,
        "chartData": chart_data,
        "estacoes": estacoes_final,
        "induction": induction_data
    }
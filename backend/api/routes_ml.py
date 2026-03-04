import sqlite3
import pandas as pd
import numpy as np
import os
from datetime import timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from itertools import combinations
from collections import Counter

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'simulador.db')

class MLParams(BaseModel):
    target_date: str
    model_type: str
    selected_shift: str = "Todos"

def get_turno(hora):
    if 6 <= hora < 14: return 'Turno 1'
    elif 14 <= hora < 22: return 'Turno 2'
    else: return 'Turno 3'

@router.post("/optimize")
def optimize_production(params: MLParams):
    target_date_obj = pd.to_datetime(params.target_date).date()
    limit_date_str = (target_date_obj - timedelta(days=90)).strftime('%Y-%m-%d')
    
    conn = sqlite3.connect(DB_PATH)
    query = f"""
        SELECT uc, data_only, hour, tipo, pecas 
        FROM inducao_start 
        WHERE data_only >= '{limit_date_str}' AND data_only <= '{params.target_date}'
    """
    df_hist = pd.read_sql_query(query, conn)
    df_hist['turno'] = df_hist['hour'].apply(get_turno)
    conn.close()

    if df_hist.empty:
        raise HTTPException(status_code=500, detail="Sem dados históricos para treinar os modelos.")

    df_hist['data_only'] = pd.to_datetime(df_hist['data_only']).dt.date
    df_day = df_hist[df_hist['data_only'] == target_date_obj].copy()

    if df_day.empty and params.model_type == 'heijunka':
        return {"error": f"Nenhum dado encontrado para o dia {params.target_date}"}

    # ==========================================
    # MODELO 1: HEIJUNKA GLOBAL
    # ==========================================
    if params.model_type == 'heijunka':
        df_day['turno'] = df_day['hour'].apply(get_turno)
        asis_grouped = df_day.groupby(['turno', 'tipo'])['pecas'].sum().reset_index()
        
        turnos_base = ['Turno 1', 'Turno 2', 'Turno 3']
        asis_data, tobe_data = [], []
        total_reg, total_var = 0, 0
        
        for t in turnos_base:
            reg = int(asis_grouped[(asis_grouped['turno'] == t) & (asis_grouped['tipo'] == 'Regular')]['pecas'].sum())
            var = int(asis_grouped[(asis_grouped['turno'] == t) & (asis_grouped['tipo'] == 'Varejo')]['pecas'].sum())
            total_reg += reg
            total_var += var
            asis_data.append({"turno": t, "real_reg": reg, "real_var": var, "real_total": reg + var})
            
        turnos_ativos = len([d for d in asis_data if d['real_total'] > 0]) or 1
        ideal_reg_turno = int(total_reg / turnos_ativos)
        ideal_var_turno = int(total_var / turnos_ativos)
        
        for d in asis_data:
            if d['real_total'] > 0:
                tobe_data.append({"turno": d['turno'], "opt_reg": ideal_reg_turno, "opt_var": ideal_var_turno, "opt_total": ideal_reg_turno + ideal_var_turno})
            else:
                tobe_data.append({"turno": d['turno'], "opt_reg": 0, "opt_var": 0, "opt_total": 0})
                
        t3_real_var = next((item['real_var'] for item in asis_data if item['turno'] == 'Turno 3'), 0)
        
        if t3_real_var > ideal_var_turno:
            insight_msg = f"Atenção: O Turno 3 operou com uma sobrecarga de {t3_real_var - ideal_var_turno:,} peças de Varejo em relação ao equilíbrio. Diluir este volume eliminaria o gargalo."
        else:
            insight_msg = "A distribuição de Varejo no Turno 3 esteve dentro da média. Nenhuma sobrecarga crítica detectada pelo Heijunka neste dia."

        return {
            "model": "heijunka", "asis_data": asis_data, "tobe_data": tobe_data, 
            "insight": insight_msg, "totals": {"reg": total_reg, "var": total_var}
        }

    # ==========================================
    # MODELO 2: LIMIAR DE SATURAÇÃO (Regressão Cúbica)
    # ==========================================
    elif params.model_type == 'saturacao':
        # Agrupa os 90 dias por hora
        hourly = df_hist.groupby(['data_only', 'hour']).agg(
            pecas_total=('pecas', 'sum'),
            pecas_var=('pecas', lambda x: x[df_hist.loc[x.index, 'tipo'] == 'Varejo'].sum())
        ).reset_index()
        
        hourly['pct_var'] = np.where(hourly['pecas_total'] > 0, (hourly['pecas_var'] / hourly['pecas_total']) * 100, 0)
        
        # 1. REDUZIMOS O FILTRO! Agora as horas de verdadeiro gargalo (<500 pçs) entram na conta.
        # Cortamos apenas horas quase mortas (ex: pausas ou quebras de turno < 100 peças).
        hourly = hourly[hourly['pecas_total'] > 100] 
        
        if len(hourly) < 10:
            return {"error": "Dados insuficientes para treinar a curva de saturação."}

        x = hourly['pct_var'].values
        y = hourly['pecas_total'].values
        
        # 2. EVOLUÇÃO: Regressão Polinomial de 3º Grau (Curva mais flexível e realista)
        coefs = np.polyfit(x, y, 3)
        p = np.poly1d(coefs)
        
        # Linha de tendência perfeita para o gráfico (100 pontos para a curva ficar suave)
        trend_x = np.linspace(min(x), max(x), 100)
        trend_y = p(trend_x)
        trend_data = [{"pct_var": round(tx, 1), "trend": int(ty)} for tx, ty in zip(trend_x, trend_y)]

        # 3. ENCONTRAR O PICO (O ponto mais alto da curva vermelha desenhada)
        max_idx = np.argmax(trend_y)
        vertice_x = trend_x[max_idx]
        
        # Verifica se o pico não está colado na margem esquerda (queda constante) 
        # ou colado na margem direita (subida constante sem quebra).
        margem = (max(x) - min(x)) * 0.05
        
        if vertice_x > min(x) + margem and vertice_x < max(x) - margem:
            insight_msg = f"A IA encontrou o Gargalo! O ponto ótimo de vazão da sua esteira ocorre perto dos {vertice_x:.1f}% de Varejo. Ultrapassar este limiar provoca uma quebra na produtividade horária."
            limiar_encontrado = round(vertice_x, 1)
        else:
            insight_msg = "A nuvem de dados apresenta uma grande dispersão. A IA não encontrou um formato claro de 'montanha', indicando que outros fatores além do Varejo podem estar a ditar as quebras de produtividade."
            limiar_encontrado = None

        # Dados para as bolinhas (Scatter)
        scatter_data = [{"pct_var": round(x[i], 1), "throughput": int(y[i])} for i in range(len(hourly))]

        return {
            "model": "saturacao", "insight": insight_msg,
            "scatter_data": scatter_data, "trend_data": trend_data,
            "limiar": limiar_encontrado
        }

    # ==========================================
    # MODELO 3: CLUSTER DE OURO (REMODELADO POR TURNO)
    # ==========================================
    elif params.model_type == 'cluster':
        insight_msg = "Análise concluída. Compare os indicadores abaixo com a média histórica."
        # Agrupamos por DIA e TURNO para uma análise granular
        group_cols = ['data_only', 'turno']
        daily = df_hist.groupby(group_cols).agg(
            pecas_total=('pecas', 'sum'),
            ucs_total=('uc', 'count'),
            pecas_var=('pecas', lambda x: x[df_hist.loc[x.index, 'tipo'] == 'Varejo'].sum())
        ).reset_index()
        
        daily['pct_var'] = np.where(daily['pecas_total'] > 0, (daily['pecas_var'] / daily['pecas_total']) * 100, 0)
        daily['densidade'] = daily['pecas_total'] / daily['ucs_total'] # Peças por Caixa
        
        # Filtro de Turno para o treinamento do Cluster
        if params.selected_shift != "Todos":
            daily_train = daily[daily['turno'] == params.selected_shift].copy()
        else:
            daily_train = daily.copy()

        if len(daily_train) < 5:
            return {"error": "Dados insuficientes para este turno específico."}

        # K-Means considerando Volume e Densidade (Métrica de refutação)
        features = daily_train[['pecas_total', 'densidade', 'pct_var']]
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)
        
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        daily_train['cluster'] = kmeans.fit_predict(features_scaled)
        
        # Cluster de Ouro (Maior média de peças)
        golden_cluster_id = daily_train.groupby('cluster')['pecas_total'].mean().idxmax()
        golden_data = daily_train[daily_train['cluster'] == golden_cluster_id]
        
        # Dados do dia alvo
        target_stats = daily[(daily['data_only'] == target_date_obj) & 
                             (daily['turno'] == (params.selected_shift if params.selected_shift != "Todos" else "Turno 3"))]
        
        if target_stats.empty:
            return {"error": "Dia/Turno não encontrado."}

        # Comparativo para o gráfico
        comparison_data = [
            {
                "metrica": "Vol. Peças", 
                "Dia Selecionado": int(target_stats['pecas_total'].iloc[0]), 
                "Cluster de Ouro": int(golden_data['pecas_total'].mean())
            },
            {
                "metrica": "Densidade (Pç/Cx)", 
                "Dia Selecionado": round(target_stats['densidade'].iloc[0], 1), 
                "Cluster de Ouro": round(golden_data['densidade'].mean(), 1)
            },
            {
                "metrica": "Mix Varejo (%)", 
                "Dia Selecionado": round(target_stats['pct_var'].iloc[0], 1), 
                "Cluster de Ouro": round(golden_data['pct_var'].mean(), 1)
            }
        ]

        return {
            "model": "cluster", 
            "insight": insight_msg,
            "comparison_data": comparison_data
        }
    
    # ==========================================
    # MODELO 4: OTIMIZADOR DE SLOTTING (Afinidade)
    # ==========================================
    elif params.model_type == 'afinidade':
        conn = sqlite3.connect(DB_PATH)
        # Puxa todas as tarefas das caixas induzidas neste dia
        query_t = f"""
            SELECT t.uc, t.catergoria_material, t.estacao 
            FROM tarefas t
            JOIN inducao_start i ON t.uc = i.uc
            WHERE i.data_only = '{params.target_date}'
              AND t.catergoria_material IS NOT NULL 
              AND t.catergoria_material != 'nan'
              AND t.catergoria_material != ''
        """
        df_t = pd.read_sql_query(query_t, conn)
        
        if df_t.empty:
            return {"error": "Sem dados de categorias para este dia. O Slotting falhou."}
            
        # Descobre a Estação principal onde cada categoria mora fisicamente
        cat_estacao = df_t.groupby('catergoria_material')['estacao'].agg(lambda x: x.mode()[0] if not x.mode().empty else 'N/A').to_dict()
        
        # Remove itens repetidos da mesma categoria na mesma caixa
        df_t = df_t.drop_duplicates(subset=['uc', 'catergoria_material'])
        
        # Agrupa as categorias por caixa (A Cesta de Compras)
        baskets = df_t.groupby('uc')['catergoria_material'].apply(list).tolist()
        
        pair_counter = Counter()
        multi_item_boxes = 0
        
        # Algoritmo de cruzamento (Acha os casais que saem juntos)
        for basket in baskets:
            if len(basket) > 1:
                multi_item_boxes += 1
                # Ordena para garantir que (A,B) seja igual a (B,A)
                for pair in combinations(sorted(basket), 2):
                    pair_counter[pair] += 1
                    
        if multi_item_boxes == 0:
            return {"error": "Nenhuma caixa com múltiplas categorias encontrada neste dia."}
            
        top_pairs = pair_counter.most_common(5)
        
        pairs_data = []
        for pair, count in top_pairs:
            cat1, cat2 = pair
            pct = round((count / multi_item_boxes) * 100, 1)
            pairs_data.append({
                "cat1": str(cat1).strip()[:20], "estacao1": str(cat_estacao.get(cat1, 'N/A')).strip(),
                "cat2": str(cat2).strip()[:20], "estacao2": str(cat_estacao.get(cat2, 'N/A')).strip(),
                "freq": count, "pct": pct
            })
            
        best = pairs_data[0] if pairs_data else None
        if best:
            insight_msg = f"🚨 Oportunidade de Slotting: {best['pct']}% de todas as caixas que continham mais de um item precisaram parar para pegar '{best['cat1']}' e '{best['cat2']}'. Verifique a distância física entre as estações [{best['estacao1']}] e [{best['estacao2']}]. Aproximá-las reduzirá drasticamente a viagem morta da caixa!"
        else:
            insight_msg = "Não foram encontradas afinidades fortes. O mix deste dia foi muito pulverizado."

        return {
            "model": "afinidade",
            "insight": insight_msg,
            "pairs_data": pairs_data,
            "total_multi": multi_item_boxes
        }
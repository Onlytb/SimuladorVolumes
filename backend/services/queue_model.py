import numpy as np

def calculate_mg1_metrics(lambda_rate: float, service_times: list, num_operators: int, skill_level: float):
    """
    Calcula as métricas da fila M/G/1.
    lambda_rate: Taxa de chegada (caixas / segundo)
    service_times: Lista de tempos de serviço históricos
    num_operators: Número de pessoas na linha
    skill_level: Habilidade (1.0 = 100%)
    """
    # Ajuste de habilidade: tempo_real = tempo_base / habilidade
    adjusted_times = np.array(service_times) / skill_level
    
    # Esperança do Serviço E[S] e E[S^2]
    e_s = np.mean(adjusted_times)
    e_s2 = np.mean(adjusted_times**2)
    
    # Taxa de serviço ajustada pelos operadores (Aproximação M/G/c via escala de taxa)
    # Para o modelo pedido (Pollaczek-Khinchine estrito), tratamos o sistema como 1 super-servidor
    mu = 1.0 / e_s
    super_mu = mu * num_operators
    
    # Utilização (rho)
    rho = lambda_rate / super_mu
    
    if rho >= 1:
        return {"status": "Saturated", "rho": rho, "wq": float('inf')}
    
    # Fórmula de Pollaczek-Khinchine: Wq = (λ * E[S²]) / (2 * (1 - ρ))
    # Adaptado para o super-servidor
    wq = (lambda_rate * (e_s2 / (num_operators**2))) / (2 * (1 - rho))
    
    # Tempo médio no sistema W = Wq + E[S]
    w = wq + (e_s / num_operators)
    
    return {
        "throughput_capacity": super_mu * 3600, # Caixas por hora
        "utilization_rho": rho,
        "queue_wait_time_wq": wq,
        "total_time_w": w,
        "p95_processing": np.percentile(adjusted_times, 95),
        "saturation_warning": rho > 0.85
    }
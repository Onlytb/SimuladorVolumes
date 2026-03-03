from services.queue_model import calculate_mg1_metrics

def simulate_full_shift(lambda_total: float, service_times: list, num_operators: int, skill_level: float, shift_hours: int = 8):
    """
    Simula o comportamento da fila ao longo de um turno de 8h,
    aplicando uma curva de variação de demanda (picos e vales).
    """
    # Curva de sazonalidade intra-turno (ex: pico no meio do turno)
    demand_multipliers = [0.8, 1.0, 1.2, 1.3, 1.1, 0.9, 0.8, 0.7] 
    
    hourly_results = []
    
    for hour in range(shift_hours):
        # Ajusta a taxa de chegada para a hora específica
        current_lambda = lambda_total * demand_multipliers[hour]
        
        # Calcula as métricas M/G/1 para esta hora
        metrics = calculate_mg1_metrics(current_lambda, service_times, num_operators, skill_level)
        
        hourly_results.append({
            "hour": f"{8 + hour:02d}:00", # Assumindo turno começando às 08:00
            "lambda_aplicado": current_lambda,
            "throughput": metrics.get("throughput_capacity", 0),
            "utilization": metrics.get("utilization_rho", 1.0),
            "wait_time": metrics.get("queue_wait_time_wq", float('inf')),
            "saturated": metrics.get("saturation_warning", True)
        })
        
    return hourly_results
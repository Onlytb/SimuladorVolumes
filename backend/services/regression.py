import numpy as np

def fit_ols_regression(df):
    """
    Modelo: tempo = a + b1*peso + b2*cubagem
    Usa numpy.linalg.lstsq para Regressão Linear Múltipla.
    """
    # Variáveis independentes (X): Adicionar coluna de 1s para o intercepto (a)
    X = np.column_stack((np.ones(len(df)), df['peso'], df['vlr_cubado_mm']))
    
    # Variável dependente (y)
    Y = df['tempo_processamento'] # Assumindo que foi calculado via timestamp
    
    # Resolve coeficientes: beta = (X^T X)^-1 X^T Y
    beta, residuals, rank, s = np.linalg.lstsq(X, Y, rcond=None)
    
    a, b1, b2 = beta
    
    return {
        "intercept_a": a,
        "coef_weight_b1": b1,
        "coef_cube_b2": b2,
        "equation": f"Tempo = {a:.2f} + {b1:.4f}*Peso + {b2:.4f}*Cubagem"
    }
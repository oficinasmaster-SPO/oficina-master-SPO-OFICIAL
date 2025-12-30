import { useState, useCallback } from "react";

/**
 * Hook para monitorar e capturar informações de créditos de integração
 * a partir de erros da API Base44
 */
export function useIntegrationCredits() {
  const [creditsInfo, setCreditsInfo] = useState(null);
  const [hasLimitError, setHasLimitError] = useState(false);

  /**
   * Processa um erro e extrai informações de créditos se for erro 402
   */
  const processError = useCallback((error) => {
    if (!error) return;

    // Verificar se é erro de limite de créditos
    const isLimitError = 
      error?.status === 402 ||
      error?.data?.extra_data?.reason === 'integration_credits_limit_reached';

    if (isLimitError && error?.data?.extra_data) {
      const extraData = error.data.extra_data;
      
      setCreditsInfo({
        creditsUsed: extraData.credits_this_month || 0,
        creditsLimit: extraData.user_tier_credits || 100,
        userTier: extraData.user_tier || 'free',
        timestamp: new Date().toISOString()
      });
      
      setHasLimitError(true);
      
      // Salvar no localStorage para persistência
      try {
        localStorage.setItem('integration_credits_info', JSON.stringify({
          creditsUsed: extraData.credits_this_month,
          creditsLimit: extraData.user_tier_credits,
          userTier: extraData.user_tier,
          timestamp: new Date().toISOString()
        }));
      } catch {
        // Ignora erro de localStorage
      }
    }

    return isLimitError;
  }, []);

  /**
   * Carrega informações salvas do localStorage
   */
  const loadSavedInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem('integration_credits_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verificar se é do mesmo mês
        const savedMonth = new Date(parsed.timestamp).getMonth();
        const currentMonth = new Date().getMonth();
        
        if (savedMonth === currentMonth) {
          setCreditsInfo(parsed);
          if (parsed.creditsUsed >= parsed.creditsLimit) {
            setHasLimitError(true);
          }
        } else {
          // Limpar dados de mês anterior
          localStorage.removeItem('integration_credits_info');
        }
      }
    } catch {
      // Ignora erro
    }
  }, []);

  /**
   * Limpa o estado de erro (para quando o usuário faz upgrade)
   */
  const clearError = useCallback(() => {
    setHasLimitError(false);
    setCreditsInfo(null);
    try {
      localStorage.removeItem('integration_credits_info');
    } catch {
      // Ignora
    }
  }, []);

  return {
    creditsInfo,
    hasLimitError,
    processError,
    loadSavedInfo,
    clearError
  };
}
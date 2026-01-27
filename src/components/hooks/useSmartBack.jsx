import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * SmartBack Hook
 * 
 * Prioridades de voltar:
 * 1. Se existe ?from= na URL → voltar para esse endereço exato
 * 2. Senão, se existe histórico anterior válido → usar navigate(-1)
 * 3. Senão → fallback para rota segura (Home ou página anterior)
 */
export const useSmartBack = (fallbackRoute = 'Home') => {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    // 1. Verifica se existe 'from' na URL
    const searchParams = new URLSearchParams(location.search);
    const fromUrl = searchParams.get('from');

    if (fromUrl) {
      // Voltar para o 'from' que pode incluir query params
      navigate(fromUrl);
      return;
    }

    // 2. Tenta usar histórico do navegador
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    // 3. Fallback: vai para rota segura
    navigate(createPageUrl(fallbackRoute));
  };

  return { goBack };
};
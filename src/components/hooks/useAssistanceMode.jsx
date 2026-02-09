import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export function useAssistanceMode() {
  const location = useLocation();

  const assistanceParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    
    return {
      isActive: params.get('assistance_mode') === 'true',
      workshopId: params.get('workshop_id'),
      assistedBy: params.get('assisted_by'),
      // Retorna string para adicionar na URL: "?assistance_mode=true&workshop_id=xxx&assisted_by=yyy"
      queryString: params.get('assistance_mode') === 'true' 
        ? `?assistance_mode=true&workshop_id=${params.get('workshop_id')}&assisted_by=${params.get('assisted_by')}`
        : ''
    };
  }, [location.search]);

  return assistanceParams;
}
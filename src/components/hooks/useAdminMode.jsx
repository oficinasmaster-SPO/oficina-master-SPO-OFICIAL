import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export function useAdminMode() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminWorkshopId, setAdminWorkshopId] = useState(null);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // RISK-03: Modo Admin só pode ser ativado por admin ou usuário interno
    const canUseAdminMode = user?.role === 'admin' || user?.user_type === 'internal';

    // Não ativar modo admin em páginas de primeiro acesso
    const isPublicPage = location.pathname.toLowerCase().includes('primeiroacesso') || 
                        location.pathname.toLowerCase().includes('primeiroaçesso');
    
    if (isPublicPage || !canUseAdminMode) {
      setIsAdminMode(false);
      setAdminWorkshopId(null);
      // Limpar storage se usuário não tem permissão
      if (!canUseAdminMode) {
        sessionStorage.removeItem('admin_workshop_id');
        localStorage.removeItem('admin_workshop_id');
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const workshopId = params.get('workshop_id');
    
    if (workshopId) {
      setIsAdminMode(true);
      setAdminWorkshopId(workshopId);
      sessionStorage.setItem('admin_workshop_id', workshopId);
    } else {
      // Tenta recuperar do sessionStorage
      const storedWorkshopId = sessionStorage.getItem('admin_workshop_id');
      if (storedWorkshopId) {
        setIsAdminMode(true);
        setAdminWorkshopId(storedWorkshopId);
      } else {
        setIsAdminMode(false);
        setAdminWorkshopId(null);
      }
    }
  }, [location.pathname, location.search, user?.id, user?.role, user?.user_type]);

  const exitAdminMode = () => {
    sessionStorage.removeItem('admin_workshop_id');
    setIsAdminMode(false);
    setAdminWorkshopId(null);
    // Remove o parâmetro da URL
    const params = new URLSearchParams(window.location.search);
    params.delete('workshop_id');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = newUrl;
  };

  const getAdminUrl = (path) => {
    if (!isAdminMode || !adminWorkshopId) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}workshop_id=${adminWorkshopId}`;
  };

  return {
    isAdminMode,
    adminWorkshopId,
    exitAdminMode,
    getAdminUrl
  };
}
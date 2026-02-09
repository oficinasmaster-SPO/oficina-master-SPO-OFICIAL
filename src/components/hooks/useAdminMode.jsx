import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useAdminMode() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminWorkshopId, setAdminWorkshopId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Não ativar modo admin em páginas de primeiro acesso
    const isPublicPage = location.pathname.toLowerCase().includes('primeiroacesso') || 
                        location.pathname.toLowerCase().includes('primeiroaçesso');
    
    if (isPublicPage) {
      setIsAdminMode(false);
      setAdminWorkshopId(null);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const workshopId = params.get('workshop_id');
    
    if (workshopId) {
      setIsAdminMode(true);
      setAdminWorkshopId(workshopId);
      sessionStorage.setItem('admin_workshop_id', workshopId);
      console.log('🔧 Modo Admin ativado para workshop:', workshopId);
    } else {
      // Tenta recuperar do sessionStorage
      const storedWorkshopId = sessionStorage.getItem('admin_workshop_id');
      if (storedWorkshopId) {
        setIsAdminMode(true);
        setAdminWorkshopId(storedWorkshopId);
        console.log('🔧 Modo Admin recuperado do storage:', storedWorkshopId);
      } else {
        setIsAdminMode(false);
        setAdminWorkshopId(null);
      }
    }
  }, [location.pathname, location.search]);

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
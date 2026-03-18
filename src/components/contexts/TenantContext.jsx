import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // Consulting Firm State
  const [consultingFirm, setConsultingFirm] = useState(null);
  const [selectedFirmId, setSelectedFirmId] = useState(() => localStorage.getItem('selected_firm_id'));
  
  // Company State
  const [company, setCompany] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => localStorage.getItem('selected_company_id'));

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const loadTenantData = async () => {
      try {
        setIsLoading(true);
        const currentUser = await base44.auth.me().catch(() => null);
        if (currentUser && !cancelled) {
          setUser(currentUser);
          
          let firmIdToLoad = selectedFirmId;
          
          // Se não tem firm selecionado no localStorage, usa o do usuário default
          if (!firmIdToLoad && currentUser.data?.consulting_firm_id) {
             firmIdToLoad = currentUser.data.consulting_firm_id;
             setSelectedFirmId(firmIdToLoad);
             localStorage.setItem('selected_firm_id', firmIdToLoad);
          }
          
          if (firmIdToLoad) {
             const firm = await base44.entities.ConsultingFirm.get(firmIdToLoad).catch(() => null);
             if (firm && !cancelled) {
                 setConsultingFirm(firm);
             }
          } else {
             if (!cancelled) setConsultingFirm(null);
          }
          
          if (selectedCompanyId) {
             const comp = await base44.entities.Company.get(selectedCompanyId).catch(() => null);
             if (comp && !cancelled) {
                 setCompany(comp);
             }
          } else {
             if (!cancelled) setCompany(null);
          }
        }
      } catch(err) {
        console.error('Erro ao carregar TenantContext:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    
    loadTenantData();
    
    return () => { cancelled = true; };
  }, [selectedFirmId, selectedCompanyId]);

  const changeConsultingFirm = (firmId) => {
    if (firmId) {
      localStorage.setItem('selected_firm_id', firmId);
    } else {
      localStorage.removeItem('selected_firm_id');
    }
    setSelectedFirmId(firmId);
    // Reset company when firm changes
    changeCompany(null);
  };

  const changeCompany = (compId) => {
    if (compId) {
      localStorage.setItem('selected_company_id', compId);
    } else {
      localStorage.removeItem('selected_company_id');
    }
    setSelectedCompanyId(compId);
  };

  return (
    <TenantContext.Provider value={{
      user,
      consultingFirm,
      selectedFirmId,
      changeConsultingFirm,
      company,
      selectedCompanyId,
      changeCompany,
      isLoading
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
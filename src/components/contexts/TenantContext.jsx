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
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

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
          
          const storedCompanyId = localStorage.getItem('selected_company_id');
          let compIdToLoad = null;

          if (storedCompanyId) {
            let validWorkshop = null;
            try {
              const wsList = await base44.entities.Workshop.filter({ id: storedCompanyId });
              if (wsList && wsList.length > 0) validWorkshop = wsList[0];
              if (!validWorkshop) {
                const cpList = await base44.entities.Company.filter({ id: storedCompanyId });
                if (cpList && cpList.length > 0) validWorkshop = cpList[0];
              }
            } catch(e) {}

            if (validWorkshop) {
              compIdToLoad = storedCompanyId;
            } else {
              localStorage.removeItem('selected_company_id');
            }
          }

          if (!compIdToLoad) {
            compIdToLoad = currentUser.data?.workshop_id || currentUser.data?.company_id || null;
            if (compIdToLoad) {
              localStorage.setItem('selected_company_id', compIdToLoad);
            }
          }
          
          if (!cancelled) setSelectedCompanyId(compIdToLoad);

          if (compIdToLoad) {
             // Tenta buscar como Workshop primeiro (novo padrão), se falhar tenta como Company (padrão legado)
             let compOrWorkshop = null;
             
             try {
                const wsList = await base44.entities.Workshop.filter({ id: compIdToLoad });
                if (wsList && wsList.length > 0) {
                   compOrWorkshop = wsList[0];
                } else {
                   const cpList = await base44.entities.Company.filter({ id: compIdToLoad });
                   if (cpList && cpList.length > 0) compOrWorkshop = cpList[0];
                }
             } catch(err) {}

             if (compOrWorkshop && !cancelled) {
                 setCompany(compOrWorkshop);
             } else if (!compOrWorkshop && !cancelled) {
                 setCompany(null);
                 // Não removemos do localStorage nem setamos null no state
                 // para evitar loop infinito caso o Workshop não seja retornado (ex: RLS, falha de rede)
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
    
    // Limpa o cache global ao trocar de tenant para evitar vazamento visual
    if (window.__REACT_QUERY_CLIENT__) {
      window.__REACT_QUERY_CLIENT__.clear();
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
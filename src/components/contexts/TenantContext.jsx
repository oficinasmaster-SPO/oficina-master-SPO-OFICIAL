import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { useAuth } from '@/lib/AuthContext';
import WheelLoader from '@/components/ui/WheelLoader';

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const { user: authUser, isAuthenticated, isLoadingAuth } = useAuth();
  const [user, setUser] = useState(null);
  
  // Consulting Firm State
  const [consultingFirm, setConsultingFirm] = useState(null);
  const [selectedFirmId, setSelectedFirmId] = useState(() => localStorage.getItem('selected_firm_id'));
  
  // Company State
  const [company, setCompany] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const loadAttemptRef = useRef(0);
  const switchingToIdRef = useRef(null); // evita race condition em cliques rápidos
  const [companySwitch, setCompanySwitch] = useState(0);

  // Wait for auth to be ready before loading tenant data
  useEffect(() => {
    if (isLoadingAuth) return; // Wait for auth to finish
    if (!isAuthenticated || !authUser) {
      setIsLoading(false);
      setUser(null);
      setConsultingFirm(null);
      setCompany(null);
      return;
    }

    let cancelled = false;
    const currentAttempt = ++loadAttemptRef.current;
    
    const loadTenantData = async () => {
      try {
        setIsLoading(true);
        const currentUser = authUser; // Use user from AuthContext instead of calling me() again
        if (cancelled || currentAttempt !== loadAttemptRef.current) return;
        
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
          
          // LOAD-03: usar apenas o ID do localStorage/perfil sem validar via query
          // A validação real acontece em useWorkshopContext via getUserWorkshops (BFF)
          const storedCompanyId = localStorage.getItem('selected_company_id');
          const compIdToLoad = storedCompanyId
            || currentUser.data?.workshop_id
            || currentUser.data?.company_id
            || currentUser.workshop_id
            || null;
          // FIX-GILMARA: currentUser.workshop_id é o campo raiz do User no banco.
          // O Base44 armazena workshop_id na raiz E em data.workshop_id.
          // Sem este fallback, usuários cujo data.workshop_id está vazio ficavam
          // com selectedCompanyId = null quando o localStorage era limpo,
          // forçando uma query BFF extra e causando lista de colaboradores vazia.

          if (!cancelled) {
            setSelectedCompanyId(compIdToLoad);
            // Não buscar o workshop aqui — useWorkshopContext fará isso via getUserWorkshops
            // Isso elimina 4 queries sequenciais do boot (Workshop.filter x2 + Company.filter x2)
          }
      } catch(err) {
        console.error('Erro ao carregar TenantContext:', err);
      } finally {
        if (!cancelled && currentAttempt === loadAttemptRef.current) {
          setIsLoading(false);
          setIsSwitching(false);
        }
      }
    };
    
    loadTenantData();
    
    return () => { cancelled = true; };
  }, [isLoadingAuth, isAuthenticated, authUser?.id, selectedFirmId, companySwitch]);

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

  const changeCompany = async (compId) => {
    if (isSwitching || switchingToIdRef.current === compId || compId === selectedCompanyId) return;
    switchingToIdRef.current = compId;

    setIsSwitching(true);

    if (compId) {
      localStorage.setItem('selected_company_id', compId);
    } else {
      localStorage.removeItem('selected_company_id');
    }
    
    // Limpa o cache global ao trocar de tenant para evitar vazamento visual
    if (queryClientInstance) {
      queryClientInstance.clear();
    } else if (window.__REACT_QUERY_CLIENT__) {
      window.__REACT_QUERY_CLIENT__.clear();
    }
    
    setSelectedCompanyId(compId);
    switchingToIdRef.current = null;
    setCompanySwitch(prev => prev + 1);
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
      isLoading,
      isSwitching
    }}>
      {isSwitching && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50/90 backdrop-blur-sm">
          <WheelLoader size="xl" text="Trocando de oficina..." />
        </div>
      )}
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
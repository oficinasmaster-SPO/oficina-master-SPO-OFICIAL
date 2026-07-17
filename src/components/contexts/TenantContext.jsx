import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import WheelLoader from '@/components/ui/WheelLoader';

// ─── localStorage helpers com namespace por email do usuário ──────────────────
// Usa email (não userId) como namespace — mais estável em cenários de migração,
// merge de contas ou troca de provider auth.
// localStorage aceita @ e . em chaves sem restrições.
function companyKey(userEmail) {
  return userEmail
    ? 'selected_company_id_' + userEmail.toLowerCase()
    : 'selected_company_id';
}
function firmKey(userEmail) {
  return userEmail
    ? 'selected_firm_id_' + userEmail.toLowerCase()
    : 'selected_firm_id';
}
// ─────────────────────────────────────────────────────────────────────────────

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const { user: authUser, isAuthenticated, isLoadingAuth } = useAuth();
  const [user, setUser] = useState(null);
  
  // Consulting Firm State
  const [consultingFirm, setConsultingFirm] = useState(null);
  const [selectedFirmId, setSelectedFirmId] = useState(() => {
    // Migração: tenta chave por userId primeiro (não disponível no init, userId ainda não carregado)
    // Na primeira carga, usa a chave global legada como fallback
    return localStorage.getItem('selected_firm_id') || null;
  });
  
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
          if (!firmIdToLoad) {
            // Tentar migrar da chave global para a chave por email
            const legacyFirmId = localStorage.getItem('selected_firm_id');
            if (legacyFirmId) {
              firmIdToLoad = legacyFirmId;
              localStorage.removeItem('selected_firm_id'); // limpar chave global
              localStorage.setItem(firmKey(currentUser.email), firmIdToLoad);
              setSelectedFirmId(firmIdToLoad);
            } else if (currentUser.data?.consulting_firm_id) {
              firmIdToLoad = currentUser.data.consulting_firm_id;
              setSelectedFirmId(firmIdToLoad);
              localStorage.setItem(firmKey(currentUser.email), firmIdToLoad);
            }
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
          // Migração: se existe chave global legada, migrar para chave por email
          const legacyCompanyId = localStorage.getItem('selected_company_id');
          if (legacyCompanyId) {
            localStorage.setItem(companyKey(currentUser.email), legacyCompanyId);
            localStorage.removeItem('selected_company_id');
          }
          const storedCompanyId = localStorage.getItem(companyKey(currentUser.email));
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
    const email = user?.email;
    if (firmId) {
      localStorage.setItem(firmKey(email), firmId);
    } else {
      localStorage.removeItem(firmKey(email));
      localStorage.removeItem('selected_firm_id'); // limpar legado
    }
    setSelectedFirmId(firmId);
    // Reset company when firm changes
    changeCompany(null);
  };

  const changeCompany = async (compId) => {
    if (isSwitching || switchingToIdRef.current === compId || compId === selectedCompanyId) return;
    switchingToIdRef.current = compId;

    setIsSwitching(true);

    const email = user?.email;
    if (compId) {
      localStorage.setItem(companyKey(email), compId);
    } else {
      localStorage.removeItem(companyKey(email));
      localStorage.removeItem('selected_company_id'); // limpar legado
    }

    // NÃO chamar queryClientInstance.clear() aqui!
    // O clear() destrói a query 'tenant-session' (TenantSessionContext),
    // fazendo workshopId virar null → SharedDataProvider desmonta →
    // páginas consumidoras perdem o contexto de dados.
    // A limpeza de cache de consumidores já é feita por switchWorkshop
    // via removeQueries com predicado que preserva 'tenant-session'.

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

/**
 * RENOMEADO (auditoria): este hook legado resolve consultoria/empresa selecionada,
 * NÃO o tenant de dados. Para tenant use useTenant de TenantSessionContext.
 * O nome useTenant foi removido daqui para eliminar a colisão de imports.
 */
export function useConsultingTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useConsultingTenant must be used within a TenantProvider');
  }
  return context;
}
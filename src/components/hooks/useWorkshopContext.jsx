import { useState, useEffect } from 'react';
import { useAdminMode } from './useAdminMode';
import { useTenant } from '@/components/contexts/TenantContext';
import { base44 } from '@/api/base44Client';

/**
 * Hook que SEMPRE retorna o workshop correto:
 * - Se em modo admin, retorna o workshop admin
 * - Senão, retorna o workshop do usuário
 */
export function useWorkshopContext() {
  const { isAdminMode, adminWorkshopId } = useAdminMode();
  const { selectedFirmId, selectedCompanyId, changeCompany, isLoading: isTenantLoading } = useTenant();
  const [workshop, setWorkshop] = useState(null);
  const [workshopsDisponiveis, setWorkshopsDisponiveis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isTenantLoading) return;

    let cancelled = false;
    
    const loadWorkshop = async () => {
      try {
        setIsLoading(true);

        // PRIORIDADE 0: TenantContext - Se o admin selecionou uma Empresa específica (que agora é a própria Oficina no seletor)
        if (selectedCompanyId) {
          let foundWorkshop = null;
          // Tentamos carregar o ID como uma Oficina (Workshop)
          try {
            const wsList = await base44.entities.Workshop.filter({ id: selectedCompanyId });
            if (wsList && wsList.length > 0) {
               foundWorkshop = wsList[0];
            } else {
               // Se falhar, tentamos carregar como Company (comportamento legado)
               const workshops = await base44.entities.Workshop.filter({ company_id: selectedCompanyId });
               if (workshops.length > 0) {
                 foundWorkshop = workshops[0];
               }
            }
          } catch (e) {}
          
          if (foundWorkshop) {
            if (!cancelled) {
              console.log('✅ Workshop TenantContext carregado:', foundWorkshop.id);
              setWorkshop(foundWorkshop);
            }
            return;
          }
          
          console.log('⚠️ ID do TenantContext inválido ou não encontrado. Tentando fallback...');
        }
        
        // PRIORIDADE 1: Modo Admin
        if (isAdminMode && adminWorkshopId) {
          console.log('🔄 Carregando workshop ADMIN:', adminWorkshopId);
          const ws = await base44.entities.Workshop.get(adminWorkshopId);
          
          if (!cancelled) {
            console.log('✅ Workshop ADMIN carregado:', {
              workshopId: ws.id,
              name: ws.name,
              city: ws.city
            });
            setWorkshop(ws);
          }
          return;
        }

        // PRIORIDADE 2: Workshop do usuário logado
        const user = await base44.auth.me();
        if (user && !cancelled) {
          let userWorkshop = null;
          let available = [];
          
          // Busca oficinas onde o usuário é owner ou partner
          try {
            const owned = await base44.entities.Workshop.filter({ owner_id: user.id });
            if (owned && owned.length > 0) available = [...owned];
            
            const partner = await base44.entities.Workshop.filter({ partner_ids: user.id });
            if (partner && partner.length > 0) {
              partner.forEach(p => {
                if (!available.find(a => a.id === p.id)) available.push(p);
              });
            }
          } catch(err) {
            console.warn('Erro ao buscar workshops do usuário:', err);
          }
          
          // Se ainda não achou nenhuma, tenta buscar as que ele é employee
          if (available.length === 0) {
            try {
              let employees = await base44.entities.Employee.filter({ user_id: user.id });
              if (!employees || employees.length === 0) {
                employees = await base44.entities.Employee.filter({ email: user.email });
              }
              if (employees && employees.length > 0) {
                for (const emp of employees) {
                  if (emp.workshop_id) {
                    try {
                      const wsFound = await base44.entities.Workshop.filter({ id: emp.workshop_id });
                      if (wsFound && wsFound.length > 0 && !available.find(a => a.id === wsFound[0].id)) {
                        available.push(wsFound[0]);
                      }
                    } catch(e) {}
                  }
                }
              }
            } catch(e) {}
          }

          if (!cancelled) setWorkshopsDisponiveis(available);

          // Define a oficina atual priorizando a selecionada via TenantContext
          if (selectedCompanyId) {
            userWorkshop = available.find(w => w.id === selectedCompanyId);
          }
          if (!userWorkshop && available.length > 0) {
            userWorkshop = available[0];
          }

          // Fallback para lógica legada via Employee caso available esteja vazio (devido ao RLS)
          if (!userWorkshop) {
            try {
              // Tenta buscar por ID
              let employees = await base44.entities.Employee.filter({ user_id: user.id });
              
              // Fallback: Tenta buscar por Email se falhar por ID
              if (!employees || employees.length === 0) {
                console.log('⚠️ WorkshopContext: Buscando employee por email (fallback)');
                employees = await base44.entities.Employee.filter({ email: user.email });
              }

              if (Array.isArray(employees) && employees.length > 0) {
                const employee = employees[0];
                if (employee.workshop_id) {
                  try {
                    const wsFound = await base44.entities.Workshop.filter({ id: employee.workshop_id });
                    if (wsFound && wsFound.length > 0) {
                      userWorkshop = wsFound[0];
                    } else {
                      // Fallback: se o RLS bloqueou a busca no front, usa a função de backend
                      console.log('⚠️ Buscando workshop via backend function (checkWorkshop) devido a RLS...');
                      const response = await base44.functions.invoke('checkWorkshop', { workshop_id: employee.workshop_id });
                      if (response.data && response.data.workshopFound) {
                        userWorkshop = response.data.workshopData;
                      }
                    }
                  } catch(e) {
                     console.warn(`Workshop do Employee não encontrado: ${employee.workshop_id}`);
                     // Tenta via backend function em caso de erro também
                     try {
                        const response = await base44.functions.invoke('checkWorkshop', { workshop_id: employee.workshop_id });
                        if (response.data && response.data.workshopFound) {
                          userWorkshop = response.data.workshopData;
                        }
                     } catch (err) {}
                  }
                }
              }
            } catch(err) {
              console.warn('Erro ao buscar employee:', err);
            }
          }

          // Se não encontrou, tenta por workshop_id (se salvo no usuário)
          const userWorkshopId = user.data?.workshop_id || user.workshop_id;
          if (!userWorkshop && userWorkshopId) {
            try {
              // Buscar workshop silenciosamente sem lançar erro global no catch do base44
              const found = await base44.entities.Workshop.filter({ id: userWorkshopId });
              if (found && found.length > 0) {
                 userWorkshop = found[0];
              } else {
                 console.warn(`Workshop com ID ${userWorkshopId} salvo no usuário não encontrado. Tentando próximo método...`);
              }
            } catch (err) {
              console.warn(`Workshop com ID ${userWorkshopId} salvo no usuário não encontrado. Tentando próximo método...`);
            }
          }

          console.log('✅ Workshop NORMAL carregado:', {
            workshopId: userWorkshop?.id,
            name: userWorkshop?.name
          });
          
          setWorkshop(userWorkshop);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar workshop context:', error);
        if (!cancelled) {
          setWorkshop(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWorkshop();
    
    return () => {
      cancelled = true;
    };
  }, [isAdminMode, adminWorkshopId, selectedCompanyId, isTenantLoading]);

  const setCurrentWorkshop = (id) => {
    if (changeCompany) {
      changeCompany(id);
    }
  };

  return {
    workshop,
    workshopId: workshop?.id || null,
    workshopsDisponiveis,
    setCurrentWorkshop,
    isLoading,
    isAdminMode
  };
}
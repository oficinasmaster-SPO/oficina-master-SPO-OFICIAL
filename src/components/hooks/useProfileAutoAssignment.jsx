import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Hook para atribuição automática de perfil a colaboradores sem profile_id
 * Monitora employees e sugere/aplica perfis padrão automaticamente
 * 
 * @param {boolean} autoAssign - Se true, atribui automaticamente. Se false, apenas sugere.
 * @param {Function} onProfileAssigned - Callback quando perfil é atribuído
 */
export function useProfileAutoAssignment(autoAssign = false, onProfileAssigned = null) {
  
  useEffect(() => {
    const checkAndAssignProfiles = async () => {
      try {
        // Buscar colaboradores sem profile_id
        const employees = await base44.entities.Employee.list();
        
        if (!Array.isArray(employees)) return;
        
        const employeesWithoutProfile = employees.filter(emp => 
          !emp.profile_id && emp.job_role && emp.status === 'ativo'
        );
        
        if (employeesWithoutProfile.length === 0) return;
        
        console.log(`🔍 Encontrados ${employeesWithoutProfile.length} colaboradores sem perfil`);
        
        for (const employee of employeesWithoutProfile) {
          try {
            if (autoAssign) {
              // Atribuir automaticamente
              const result = await base44.functions.invoke('autoAssignProfile', {
                employee_id: employee.id,
                job_role: employee.job_role
              });
              
              if (result.data?.success) {
                console.log(`✅ Perfil atribuído a ${employee.full_name}: ${result.data.profile_name}`);
                
                if (onProfileAssigned) {
                  onProfileAssigned(employee, result.data);
                }
              }
            } else {
              // Apenas sugerir
              toast.info(
                `${employee.full_name} não possui perfil atribuído. Deseja atribuir automaticamente?`,
                {
                  action: {
                    label: 'Atribuir',
                    onClick: async () => {
                      try {
                        const result = await base44.functions.invoke('autoAssignProfile', {
                          employee_id: employee.id,
                          job_role: employee.job_role
                        });
                        
                        if (result.data?.success) {
                          toast.success(`Perfil atribuído: ${result.data.profile_name}`);
                          
                          if (onProfileAssigned) {
                            onProfileAssigned(employee, result.data);
                          }
                        }
                      } catch (error) {
                        toast.error('Erro ao atribuir perfil: ' + error.message);
                      }
                    }
                  },
                  duration: 10000
                }
              );
            }
          } catch (error) {
            console.error(`Erro ao processar ${employee.full_name}:`, error);
          }
        }
        
      } catch (error) {
        console.error('Erro ao verificar perfis:', error);
      }
    };
    
    // Executar verificação após um delay para não impactar carregamento inicial
    const timer = setTimeout(checkAndAssignProfiles, 2000);
    
    return () => clearTimeout(timer);
  }, [autoAssign, onProfileAssigned]);
}
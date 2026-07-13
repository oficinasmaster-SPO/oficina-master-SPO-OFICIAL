import { useTenantSession } from '@/components/contexts/TenantSessionContext';

/**
 * useWorkshopContext — CAMADA DE COMPATIBILIDADE.
 *
 * Delegado para o TenantSessionContext (useTenant), que resolve o tenant
 * exclusivamente via backend (function resolveTenant). Mantém a API
 * consumida pelas páginas existentes (workshop, workshopId,
 * workshopsDisponiveis, setCurrentWorkshop, isLoading, isAdminMode)
 * para não reescrever todos os consumidores.
 *
 * O TenantContext legado NÃO é mais fonte de decisão de tenant.
 */
export function useWorkshopContext() {
  const tenant = useTenantSession();

  return {
    workshop: tenant.workshop,
    workshopId: tenant.workshopId,
    workshopsDisponiveis: tenant.availableWorkshops,
    setCurrentWorkshop: tenant.switchWorkshop,
    isLoading: tenant.isLoading,
    isAdminMode: tenant.isAdminMode,
  };
}
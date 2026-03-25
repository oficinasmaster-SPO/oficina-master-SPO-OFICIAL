import { usePermissionsContext } from "@/components/contexts/PermissionsContext";

/**
 * Hook para verificar permissões do usuário atual.
 * Ele agora consome o PermissionsContext que é "workshop-aware", ou seja, 
 * as permissões mudam automaticamente dependendo do workshop selecionado.
 */
export function usePermissions() {
  return usePermissionsContext();
}
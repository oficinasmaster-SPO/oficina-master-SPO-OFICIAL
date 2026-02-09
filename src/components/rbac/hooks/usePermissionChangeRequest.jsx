import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Hook para criar solicitações de mudança de permissão
 */
export function usePermissionChangeRequest() {
  const queryClient = useQueryClient();
  
  const createRequestMutation = useMutation({
    mutationFn: async (requestData) => {
      return await base44.entities.PermissionChangeRequest.create(requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-requests'] });
      toast.success('Solicitação criada e enviada para aprovação');
    },
    onError: (error) => {
      toast.error('Erro ao criar solicitação: ' + error.message);
    }
  });
  
  return {
    createRequest: createRequestMutation.mutate,
    isCreating: createRequestMutation.isPending
  };
}

/**
 * Prepara dados para solicitação de mudança de perfil
 */
export function prepareProfileChangeRequest(employee, newProfileId, newProfileName, user, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    requested_by: user.email,
    requested_by_name: user.full_name,
    change_type: 'profile_change',
    current_profile_id: employee.profile_id || null,
    requested_profile_id: newProfileId,
    requested_profile_name: newProfileName,
    justification: justification || 'Mudança de perfil solicitada',
    status: 'pendente'
  };
}

/**
 * Prepara dados para solicitação de mudança de custom roles
 */
export function prepareCustomRolesChangeRequest(employee, newCustomRoleIds, user, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    requested_by: user.email,
    requested_by_name: user.full_name,
    change_type: 'custom_roles_add',
    current_custom_role_ids: employee.custom_role_ids || [],
    requested_custom_role_ids: newCustomRoleIds,
    justification: justification || 'Mudança de roles customizadas solicitada',
    status: 'pendente'
  };
}

/**
 * Prepara dados para solicitação de mudança de status
 */
export function prepareStatusChangeRequest(employee, newStatus, user, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    requested_by: user.email,
    requested_by_name: user.full_name,
    change_type: 'status_change',
    current_status: employee.user_status || employee.status,
    requested_status: newStatus,
    justification: justification || 'Mudança de status solicitada',
    status: 'pendente'
  };
}
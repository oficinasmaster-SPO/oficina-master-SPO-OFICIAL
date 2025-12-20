import React from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Hook para gerenciar mudanças de permissão com fluxo de aprovação
 */
export function usePermissionChangeRequest() {
  const queryClient = useQueryClient();

  const createRequestMutation = useMutation({
    mutationFn: async (requestData) => {
      const user = await base44.auth.me();
      
      const payload = {
        ...requestData,
        requested_by: user.email,
        requested_by_name: user.full_name,
        status: 'pendente'
      };

      return await base44.entities.PermissionChangeRequest.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissionRequests']);
      toast.success('Solicitação enviada para aprovação!');
    },
    onError: (err) => {
      toast.error('Erro ao criar solicitação: ' + err.message);
    }
  });

  return {
    createRequest: createRequestMutation.mutate,
    isCreating: createRequestMutation.isPending
  };
}

/**
 * Prepara os dados para uma solicitação de mudança de perfil
 */
export function prepareProfileChangeRequest(employee, currentProfile, newProfile, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    change_type: 'profile_change',
    current_profile_id: currentProfile?.id || null,
    current_profile_name: currentProfile?.name || 'Sem perfil',
    requested_profile_id: newProfile.id,
    requested_profile_name: newProfile.name,
    current_custom_role_ids: employee.custom_role_ids || [],
    requested_custom_role_ids: employee.custom_role_ids || [],
    justification
  };
}

/**
 * Prepara os dados para uma solicitação de mudança de roles customizadas
 */
export function prepareCustomRolesChangeRequest(employee, currentRoleIds, newRoleIds, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    change_type: newRoleIds.length > (currentRoleIds?.length || 0) ? 'custom_roles_add' : 'custom_roles_remove',
    current_custom_role_ids: currentRoleIds || [],
    requested_custom_role_ids: newRoleIds,
    justification
  };
}

/**
 * Prepara os dados para uma solicitação de mudança de status
 */
export function prepareStatusChangeRequest(employee, currentStatus, newStatus, justification) {
  return {
    employee_id: employee.id,
    employee_name: employee.full_name,
    change_type: 'status_change',
    current_status: currentStatus,
    requested_status: newStatus,
    justification
  };
}
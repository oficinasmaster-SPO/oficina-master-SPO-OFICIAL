import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RequestApprovalDialog({ open, onClose, request, onProcessed }) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Buscar o employee atual para obter os dados completos
      const employee = await base44.entities.Employee.get(request.employee_id);
      
      // Preparar dados de atualização baseados no tipo de mudança
      const updateData = {};
      
      if (request.change_type === 'profile_change') {
        updateData.profile_id = request.requested_profile_id;
      }
      
      if (request.change_type === 'custom_roles_add' || request.change_type === 'custom_roles_remove') {
        updateData.custom_role_ids = request.requested_custom_role_ids;
      }
      
      if (request.change_type === 'status_change') {
        updateData.user_status = request.requested_status;
      }

      // Adicionar auditoria
      const auditEntry = {
        changed_by: user.full_name,
        changed_by_email: user.email,
        changed_at: new Date().toISOString(),
        action: 'permission_change_approved',
        field_changed: request.change_type,
        old_value: JSON.stringify({
          profile: request.current_profile_name,
          custom_roles: request.current_custom_role_ids,
          status: request.current_status
        }),
        new_value: JSON.stringify({
          profile: request.requested_profile_name,
          custom_roles: request.requested_custom_role_ids,
          status: request.requested_status
        })
      };

      updateData.audit_log = [...(employee.audit_log || []), auditEntry];

      // Aplicar mudanças no Employee
      await base44.entities.Employee.update(request.employee_id, updateData);

      // Atualizar status da solicitação
      await base44.entities.PermissionChangeRequest.update(request.id, {
        status: 'aprovado',
        approved_by: user.email,
        approved_by_name: user.full_name,
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissionRequests']);
      queryClient.invalidateQueries(['admin-users']);
      toast.success('Solicitação aprovada e mudanças aplicadas!');
      onProcessed();
      onClose();
    },
    onError: (err) => {
      toast.error('Erro ao aprovar solicitação: ' + err.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      await base44.entities.PermissionChangeRequest.update(request.id, {
        status: 'rejeitado',
        approved_by: user.email,
        approved_by_name: user.full_name,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissionRequests']);
      toast.success('Solicitação rejeitada');
      onProcessed();
      onClose();
      setRejectionReason('');
      setShowRejectionInput(false);
    },
    onError: (err) => {
      toast.error('Erro ao rejeitar solicitação: ' + err.message);
    }
  });

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprovar Mudança de Permissão</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Colaborador</Label>
              <p className="font-medium">{request.employee_name}</p>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500">Solicitante</Label>
              <p className="text-sm">{request.requested_by_name} ({request.requested_by})</p>
            </div>

            {request.change_type === 'profile_change' && (
              <div>
                <Label className="text-xs text-gray-500">Mudança de Perfil</Label>
                <p className="text-sm">
                  <span className="line-through text-gray-500">{request.current_profile_name || 'Sem perfil'}</span>
                  {' → '}
                  <span className="font-medium text-green-600">{request.requested_profile_name}</span>
                </p>
              </div>
            )}

            {request.change_type === 'status_change' && (
              <div>
                <Label className="text-xs text-gray-500">Mudança de Status</Label>
                <p className="text-sm">
                  <span className="line-through text-gray-500">{request.current_status}</span>
                  {' → '}
                  <span className="font-medium text-green-600">{request.requested_status}</span>
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500">Justificativa</Label>
              <p className="text-sm text-gray-700 italic">"{request.justification}"</p>
            </div>
          </div>

          {!showRejectionInput ? (
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Fechar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowRejectionInput(true)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
              <Button 
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {approveMutation.isPending ? 'Aprovando...' : 'Aprovar'}
              </Button>
            </DialogFooter>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Motivo da Rejeição</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique por que esta solicitação está sendo rejeitada..."
                  className="h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRejectionInput(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => rejectMutation.mutate()}
                  disabled={!rejectionReason.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
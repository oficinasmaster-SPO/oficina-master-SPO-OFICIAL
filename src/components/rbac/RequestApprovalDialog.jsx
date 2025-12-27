import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RequestApprovalDialog({ open, onClose, request }) {
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState(null);
  const queryClient = useQueryClient();

  const approvalMutation = useMutation({
    mutationFn: async ({ requestId, approve, feedback }) => {
      const result = await base44.functions.invoke('processPermissionRequest', {
        request_id: requestId,
        approve,
        feedback
      });
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['permission-requests']);
      queryClient.invalidateQueries(['admin-users']);
      queryClient.invalidateQueries(['rbac-logs-analytics']);
      
      if (data.approved) {
        toast.success("Solicitação aprovada! Permissões aplicadas.");
      } else {
        toast.success("Solicitação rejeitada.");
      }
      
      setFeedback("");
      setAction(null);
      onClose();
    },
    onError: (error) => {
      toast.error("Erro ao processar: " + error.message);
      setAction(null);
    }
  });

  const handleApprove = () => {
    if (!request?.id) return;
    setAction('approve');
    approvalMutation.mutate({ 
      requestId: request.id, 
      approve: true, 
      feedback 
    });
  };

  const handleReject = () => {
    if (!request?.id || !feedback.trim()) {
      toast.error("Por favor, forneça uma justificativa para a rejeição");
      return;
    }
    setAction('reject');
    approvalMutation.mutate({ 
      requestId: request.id, 
      approve: false, 
      feedback 
    });
  };

  if (!request) return null;

  const isPending = request.status === 'pendente';
  const isApproved = request.status === 'aprovado';
  const isRejected = request.status === 'rejeitado';

  const getChangeDescription = () => {
    switch (request.change_type) {
      case 'profile_change':
        return (
          <div>
            <p className="font-semibold mb-2">Mudança de Perfil:</p>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">{request.current_profile_name || 'Sem perfil'}</Badge>
              <span>→</span>
              <Badge className="bg-blue-100 text-blue-700">{request.requested_profile_name}</Badge>
            </div>
          </div>
        );
      case 'custom_roles_add':
        return (
          <div>
            <p className="font-semibold mb-2">Adicionar Roles Customizadas:</p>
            <div className="space-y-1">
              {(request.requested_custom_role_ids || []).map(roleId => (
                <Badge key={roleId} className="mr-2">{roleId}</Badge>
              ))}
            </div>
          </div>
        );
      case 'status_change':
        return (
          <div>
            <p className="font-semibold mb-2">Mudança de Status:</p>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">{request.current_status}</Badge>
              <span>→</span>
              <Badge className="bg-purple-100 text-purple-700">{request.requested_status}</Badge>
            </div>
          </div>
        );
      default:
        return <p>Tipo de mudança: {request.change_type}</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPending && <AlertTriangle className="w-5 h-5 text-orange-600" />}
            {isApproved && <CheckCircle className="w-5 h-5 text-green-600" />}
            {isRejected && <XCircle className="w-5 h-5 text-red-600" />}
            Solicitação de Alteração de Permissão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Banner */}
          {!isPending && (
            <Alert className={isApproved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <AlertDescription>
                <p className="font-semibold">
                  {isApproved ? "✅ Aprovado" : "❌ Rejeitado"}
                </p>
                <p className="text-sm mt-1">
                  Por {request.approved_by_name} em {format(new Date(request.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {request.rejection_reason && (
                  <p className="text-sm mt-2 p-2 bg-white rounded border">
                    <strong>Motivo:</strong> {request.rejection_reason}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Informações do Colaborador */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">Colaborador:</h4>
            <p className="text-sm">
              <strong>Nome:</strong> {request.employee_name}
            </p>
          </div>

          {/* Detalhes da Mudança */}
          <div className="border rounded-lg p-4">
            {getChangeDescription()}
          </div>

          {/* Justificativa do Solicitante */}
          {request.justification && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-2">Justificativa:</h4>
              <p className="text-sm">{request.justification}</p>
            </div>
          )}

          {/* Solicitante */}
          <div className="text-sm text-gray-600">
            <p>
              <strong>Solicitado por:</strong> {request.requested_by_name || request.requested_by}
            </p>
            <p>
              <strong>Data da solicitação:</strong> {format(new Date(request.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Área de Feedback (apenas para pendentes) */}
          {isPending && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Observações {!isPending && "(Opcional)"}:
              </label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Adicione observações sobre esta decisão..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                {isPending ? "Obrigatório para rejeição" : ""}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {isPending ? 'Cancelar' : 'Fechar'}
            </Button>
            
            {isPending && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={approvalMutation.isPending || !feedback.trim()}
                >
                  {approvalMutation.isPending && action === 'reject' && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                
                <Button
                  onClick={handleApprove}
                  disabled={approvalMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approvalMutation.isPending && action === 'approve' && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
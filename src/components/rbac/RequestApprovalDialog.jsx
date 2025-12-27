import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function RequestApprovalDialog({ 
  request, 
  onClose, 
  onApprove, 
  onReject,
  isProcessing 
}) {
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  
  const handleConfirm = () => {
    if (decision === 'approve') {
      onApprove(reason);
    } else if (decision === 'reject') {
      if (!reason) {
        alert('Por favor, informe o motivo da rejeição');
        return;
      }
      onReject(reason);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar Solicitação de Mudança</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Informações da solicitação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Detalhes da Solicitação</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Colaborador:</span>
                <span className="font-medium text-blue-900">{request.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Solicitado por:</span>
                <span className="font-medium text-blue-900">{request.requested_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Tipo de mudança:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {request.change_type === 'profile_change' ? 'Mudança de Perfil' : 
                   request.change_type === 'custom_roles_add' ? 'Adicionar Roles' : 
                   'Mudança de Status'}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Justificativa */}
          {request.justification && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Justificativa</h4>
              <p className="text-sm text-gray-700">{request.justification}</p>
            </div>
          )}
          
          {/* Comparação antes/depois */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-yellow-800 mb-2">Atual</h5>
              <p className="text-sm text-yellow-900">
                {request.current_profile_name || 'Sem perfil'}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-green-800 mb-2">Solicitado</h5>
              <p className="text-sm text-green-900">
                {request.requested_profile_name || 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Alerta de impacto */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Atenção: Mudança Crítica</p>
              <p>Esta alteração modificará as permissões de acesso do colaborador. Certifique-se de que a mudança é necessária e apropriada.</p>
            </div>
          </div>
          
          {/* Área de decisão */}
          {!decision && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setDecision('approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button
                onClick={() => setDecision('reject')}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          )}
          
          {/* Confirmação da decisão */}
          {decision && (
            <div className={`${
              decision === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            } border rounded-lg p-4 space-y-3`}>
              <Label className={decision === 'approve' ? 'text-green-900' : 'text-red-900'}>
                {decision === 'approve' ? 'Comentário (opcional)' : 'Motivo da rejeição *'}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={decision === 'approve' ? 
                  'Adicione comentários sobre a aprovação...' : 
                  'Explique o motivo da rejeição...'
                }
                className="h-20"
              />
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setDecision(null);
                    setReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className={`flex-1 ${
                    decision === 'approve' ? 
                    'bg-green-600 hover:bg-green-700' : 
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? 'Processando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
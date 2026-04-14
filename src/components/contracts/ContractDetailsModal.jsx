import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Send, Copy, Edit, Trash } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ContractDetailsModal({ contract, open, onClose, onEdit }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Contract.delete(contract.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato excluído com sucesso!");
      onClose();
    },
    onError: () => {
      toast.error("Erro ao excluir contrato.");
    }
  });

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate();
    }
  };
  if (!contract) return null;

  const statusConfig = {
    rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-800" },
    enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
    dados_preenchidos: { label: "Dados Preenchidos", color: "bg-yellow-100 text-yellow-800" },
    assinado: { label: "Assinado", color: "bg-purple-100 text-purple-800" },
    pagamento_confirmado: { label: "Pagamento Confirmado", color: "bg-green-100 text-green-800" },
    efetivado: { label: "Efetivado", color: "bg-green-600 text-white" },
    cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" }
  };

  const copyLink = () => {
    const link = contract.contract_link || `${window.location.origin}/contrato/${contract.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Contrato</span>
            <Badge className={statusConfig[contract.status]?.color}>
              {statusConfig[contract.status]?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Progresso */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">Progresso de Efetivação</span>
              <span className="text-2xl font-bold text-blue-600">{contract.completion_percentage || 0}%</span>
            </div>
            <Progress value={contract.completion_percentage || 0} className="h-3 mb-3" />
            
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className={`flex items-center gap-2 ${contract.client_data_filled ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>Dados Preenchidos</span>
              </div>
              <div className={`flex items-center gap-2 ${contract.client_signed ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>Assinado</span>
              </div>
              <div className={`flex items-center gap-2 ${contract.payment_confirmed ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-4 h-4" />
                <span>Pagamento OK</span>
              </div>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Oficina</Label>
              <p className="font-semibold">{contract.workshop_name}</p>
            </div>
            <div>
              <Label className="text-gray-600">Número do Contrato</Label>
              <p className="font-semibold">{contract.contract_number}</p>
            </div>
            <div>
              <Label className="text-gray-600">Plano</Label>
              <p className="font-semibold">{contract.plan_type}</p>
            </div>
            <div>
              <Label className="text-gray-600">Consultor Responsável</Label>
              <p className="font-semibold">{contract.consultor_nome}</p>
            </div>
            <div>
              <Label className="text-gray-600">Valor do Contrato</Label>
              <p className="font-semibold text-green-600">
                R$ {contract.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <Label className="text-gray-600">Valor Mensal</Label>
              <p className="font-semibold">
                R$ {contract.monthly_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row sm:justify-between items-center w-full gap-4 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button onClick={() => { onClose(); onEdit(contract); }} variant="outline" className="border-gray-300">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button onClick={handleDelete} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMutation.isPending}>
              <Trash className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
          
          <div className="text-left sm:text-right text-xs text-gray-500 w-full sm:w-auto">
            {contract.timeline && contract.timeline.length > 0 ? (
              <>
                <p>Atualizado em: {format(new Date(contract.timeline[contract.timeline.length - 1].date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p>Por: <span className="font-medium">{contract.timeline[contract.timeline.length - 1].user || "Sistema"}</span></p>
              </>
            ) : (
              <p>Sem informações de histórico</p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
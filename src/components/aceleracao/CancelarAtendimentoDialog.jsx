import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CancelarAtendimentoDialog({ open, onOpenChange, atendimento }) {
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!motivo.trim()) throw new Error("Informe o motivo do cancelamento");
      // Update status + save motivo
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        status: 'cancelado',
        observacoes_consultor: `${atendimento.observacoes_consultor || ''}\n\n--- MOTIVO DO CANCELAMENTO ---\n${motivo}`.trim()
      });
      // Generate ATA with cancellation reason
      await base44.functions.invoke('gerarAtaConsultoria', {
        atendimento_id: atendimento.id
      });
    },
    onSuccess: () => {
      toast.success("Atendimento cancelado e ATA gerada");
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
      setMotivo("");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            Cancelar Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            Esta ação irá cancelar o atendimento e gerar uma ATA com o motivo informado.
          </div>
          <div>
            <Label>Motivo do cancelamento *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={4}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={mutation.isPending || !motivo.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelando...</> : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
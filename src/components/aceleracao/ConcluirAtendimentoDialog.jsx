import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { toBrazilDate } from "@/utils/timezone";

export default function ConcluirAtendimentoDialog({ open, onOpenChange, atendimento, workshops }) {
  const queryClient = useQueryClient();

  // Fetch ATA if exists
  const { data: ata, isLoading: loadingAta } = useQuery({
    queryKey: ['ata-preview', atendimento?.ata_id],
    queryFn: () => base44.entities.MeetingMinutes.get(atendimento.ata_id),
    enabled: !!atendimento?.ata_id && open
  });

  const workshop = workshops?.find(w => w.id === atendimento?.workshop_id);

  const mutation = useMutation({
    mutationFn: async () => {
      let ataId = atendimento.ata_id;
      // Generate ATA if not exists
      if (!ataId) {
        const res = await base44.functions.invoke('gerarAtaConsultoria', {
          atendimento_id: atendimento.id
        });
        ataId = res.data?.ata_id;
        if (ataId) {
          await base44.entities.ConsultoriaAtendimento.update(atendimento.id, { ata_id: ataId });
        }
      }
      // Finalize ATA
      if (ataId) {
        await base44.entities.MeetingMinutes.update(ataId, { status: 'finalizada' });
      }
      // Set status to concluido
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, { status: 'concluido' });
    },
    onSuccess: () => {
      toast.success("Atendimento concluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error("Erro: " + err.message)
  });

  if (!atendimento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            Concluir Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            Ao confirmar, a ATA será finalizada e o status mudará para <strong>Concluído</strong>.
          </div>

          {/* Preview summary */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900">Resumo do Atendimento</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{workshop?.name || '-'}</span></div>
              <div><span className="text-gray-500">Consultor:</span> <span className="font-medium">{atendimento.consultor_nome || '-'}</span></div>
              <div><span className="text-gray-500">Tipo:</span> <span className="font-medium capitalize">{atendimento.tipo_atendimento?.replace(/_/g, ' ')}</span></div>
              <div><span className="text-gray-500">Duração:</span> <span className="font-medium">{atendimento.duracao_minutos} min</span></div>
            </div>

            {/* ATA preview */}
            {loadingAta ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : ata?.ata_ia ? (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-semibold text-purple-600 uppercase mb-2">Resumo gerado por IA</p>
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                  <ReactMarkdown>{ata.ata_ia}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="mt-4 border-t pt-4 text-sm text-gray-500 text-center py-4">
                {atendimento.ata_id ? 'ATA sem resumo de IA disponível.' : 'Uma ATA será gerada automaticamente ao concluir.'}
              </div>
            )}

            {/* Next steps */}
            {atendimento.proximos_passos_list?.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Próximos Passos</p>
                <div className="space-y-1">
                  {atendimento.proximos_passos_list.filter(p => p.descricao).map((step, idx) => (
                    <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                      <span>{step.descricao}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Concluindo...</> : 'Confirmar Conclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
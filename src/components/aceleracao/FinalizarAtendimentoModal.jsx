import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function FinalizarAtendimentoModal({ atendimento, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    topicos_discutidos: [],
    decisoes_tomadas: [],
    acoes_geradas: [],
    observacoes_consultor: atendimento.observacoes_consultor || "",
    proximos_passos: atendimento.proximos_passos || "",
    enviar_notificacao: true,
    gerar_ata: true
  });

  const finalizarMutation = useMutation({
    mutationFn: async (data) => {
      // Atualizar atendimento para "realizado"
      const updated = await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        status: 'realizado',
        data_realizada: new Date().toISOString(),
        topicos_discutidos: data.topicos_discutidos,
        decisoes_tomadas: data.decisoes_tomadas,
        acoes_geradas: data.acoes_geradas,
        observacoes_consultor: data.observacoes_consultor,
        proximos_passos: data.proximos_passos
      });

      // Gerar ata se solicitado
      if (data.gerar_ata) {
        try {
          await base44.functions.invoke('gerarAtaConsultoria', {
            atendimento_id: atendimento.id
          });
        } catch (error) {
          console.error('Erro ao gerar ata:', error);
        }
      }

      // Enviar notificação se solicitado
      if (data.enviar_notificacao) {
        try {
          await base44.functions.invoke('notificarClienteAtendimento', {
            atendimento_id: atendimento.id
          });
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aceleracao-atendimentos']);
      toast.success('Atendimento finalizado com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao finalizar atendimento: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    finalizarMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Finalizar Atendimento</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações do Consultor *
              </label>
              <Textarea
                value={formData.observacoes_consultor}
                onChange={(e) => setFormData({ ...formData, observacoes_consultor: e.target.value })}
                rows={4}
                placeholder="Resumo do atendimento, pontos importantes discutidos..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Próximos Passos
              </label>
              <Textarea
                value={formData.proximos_passos}
                onChange={(e) => setFormData({ ...formData, proximos_passos: e.target.value })}
                rows={3}
                placeholder="O que deve ser feito até o próximo encontro..."
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.gerar_ata}
                  onCheckedChange={(checked) => setFormData({ ...formData, gerar_ata: checked })}
                />
                <label className="text-sm text-gray-700">
                  Gerar Ata automaticamente (IA)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.enviar_notificacao}
                  onCheckedChange={(checked) => setFormData({ ...formData, enviar_notificacao: checked })}
                />
                <label className="text-sm text-gray-700">
                  Enviar notificação e questionário de avaliação ao cliente
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={finalizarMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={finalizarMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Finalizar Atendimento
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
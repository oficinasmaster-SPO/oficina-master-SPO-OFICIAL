import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import NotificationSchedulerModal from "@/components/aceleracao/NotificationSchedulerModal";
import TemplateAtendimentoModal from "@/components/aceleracao/TemplateAtendimentoModal";
import ClientDetailPanel from "@/components/aceleracao/ClientDetailPanel";

export default function AdvancedOptionsSection({ formData, setFormData, workshops }) {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showConsultoriasPanel, setShowConsultoriasPanel] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Opções Avançadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowNotificationModal(true)}
          >
            📅 Programar Notificações Automáticas
          </Button>

          {!formData.id && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowTemplateModal(true)}
            >
              📋 Usar Template de Atendimento
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              if (!formData.workshop_id) {
                toast.error("Selecione uma oficina primeiro");
                return;
              }
              setShowConsultoriasPanel(true);
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            📋 Ver Detalhes da Oficina
          </Button>

          {formData.workshop_id && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={async () => {
                try {
                  toast.info('Gerando relatório completo...');
                  const response = await base44.functions.invoke('gerarRelatorioCliente', {
                    workshop_id: formData.workshop_id
                  });
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Relatorio_Completo_${new Date().toISOString().split('T')[0]}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                  toast.success('Relatório gerado com sucesso!');
                } catch (error) {
                  toast.error('Erro ao gerar relatório: ' + error.message);
                }
              }}
            >
              Gerar Relatório Completo do Cliente
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {showNotificationModal && (
        <NotificationSchedulerModal
          onClose={() => setShowNotificationModal(false)}
          onSave={(notificacoes) => {
            setFormData(prev => ({ ...prev, notificacoes_programadas: notificacoes }));
            setShowNotificationModal(false);
            toast.success('Notificações programadas!');
          }}
        />
      )}

      {showTemplateModal && (
        <TemplateAtendimentoModal
          onClose={() => setShowTemplateModal(false)}
          onSelect={(template) => {
            setFormData(prev => ({
              ...prev,
              tipo_atendimento: template.tipo,
              pauta: template.pauta || [{ titulo: "", descricao: "", tempo_estimado: 15 }],
              objetivos: template.objetivos || [""],
              duracao_minutos: template.duracao_minutos || 60
            }));
            setShowTemplateModal(false);
            toast.success('Template aplicado!');
          }}
        />
      )}

      {showConsultoriasPanel && formData.workshop_id && (
        <ClientDetailPanel
          client={workshops?.find(w => w.id === formData.workshop_id) || null}
          isOpen={true}
          onClose={() => setShowConsultoriasPanel(false)}
          atendimentos={[]}
          processos={[]}
          defaultTab="consultoria"
        />
      )}
    </>
  );
}
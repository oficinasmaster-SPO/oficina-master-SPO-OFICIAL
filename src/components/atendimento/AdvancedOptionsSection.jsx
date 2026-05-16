import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import NotificationSchedulerModal from "@/components/aceleracao/NotificationSchedulerModal";
import TemplateAtendimentoModal from "@/components/aceleracao/TemplateAtendimentoModal";
import ClientDetailPanel from "@/components/aceleracao/ClientDetailPanel";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import TarefaBacklogForm from "@/components/aceleracao/TarefaBacklogForm";
import PedidoInternoForm from "@/components/aceleracao/PedidoInternoForm";

export default function AdvancedOptionsSection({ formData, setFormData, workshops }) {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showConsultoriasPanel, setShowConsultoriasPanel] = useState(false);
  const [showTarefaDrawer, setShowTarefaDrawer] = useState(false);
  const [showPedidoDrawer, setShowPedidoDrawer] = useState(false);
  const [tarefasVinculadas, setTarefasVinculadas] = useState([]);
  const [pedidosVinculados, setPedidosVinculados] = useState([]);

  // Portais renderizados diretamente no document.body para escapar de qualquer stacking context
  const modals = (
    <>
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
          key={formData.workshop_id}
          client={workshops?.find(w => w.id === formData.workshop_id) || null}
          isOpen={true}
          onClose={() => setShowConsultoriasPanel(false)}
          atendimentos={[]}
          processos={[]}
          defaultTab="consultoria"
        />
      )}

      {showTarefaDrawer && (
        <Drawer open={showTarefaDrawer} onOpenChange={setShowTarefaDrawer}>
          <DrawerContent className="max-h-[90vh] flex flex-col" style={{ zIndex: 99999 }}>
            <DrawerHeader>
              <DrawerTitle>Criar Nova Tarefa</DrawerTitle>
              <DrawerClose />
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4">
              <TarefaBacklogForm
                workshopId={formData.workshop_id}
                workshops={workshops}
                user={formData}
                onSuccess={(tarefaId) => {
                  setTarefasVinculadas([...tarefasVinculadas, tarefaId]);
                  setShowTarefaDrawer(false);
                  toast.success(`✅ Tarefa vinculada ao atendimento!`);
                }}
                onCancel={() => setShowTarefaDrawer(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {showPedidoDrawer && (
        <Drawer open={showPedidoDrawer} onOpenChange={setShowPedidoDrawer}>
          <DrawerContent className="max-h-[90vh] flex flex-col" style={{ zIndex: 99999 }}>
            <DrawerHeader>
              <DrawerTitle>Criar Novo Pedido Interno</DrawerTitle>
              <DrawerClose />
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4">
              <PedidoInternoForm
                user={formData}
                usuarios={[]}
                workshops={workshops}
                clienteId={formData.workshop_id}
                onSuccess={(pedidoId) => {
                  setPedidosVinculados([...pedidosVinculados, pedidoId]);
                  setShowPedidoDrawer(false);
                  toast.success(`📋 Pedido vinculado ao atendimento!`);
                }}
                onCancel={() => setShowPedidoDrawer(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );

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

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              if (!formData.workshop_id) {
                toast.error("Selecione uma oficina primeiro");
                return;
              }
              setShowPedidoDrawer(true);
            }}
          >
            📌 + Novo Pedido Interno
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              if (!formData.workshop_id) {
                toast.error("Selecione uma oficina primeiro");
                return;
              }
              setShowTarefaDrawer(true);
            }}
          >
            ✅ + Nova Tarefa
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

      {/* Modais renderizados fora do stacking context do form via createPortal */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(modals, document.body)}
    </>
  );
}
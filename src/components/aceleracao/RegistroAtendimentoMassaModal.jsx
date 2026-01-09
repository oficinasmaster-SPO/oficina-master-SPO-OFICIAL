import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Save, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AtendimentoMassaForm from "./MassRegistrationTabs/AtendimentoMassaForm";
import ConfigurarDestinatarios from "./MassRegistrationTabs/ConfigurarDestinatarios";
import RelatoriosTab from "./MassRegistrationTabs/RelatoriosTab";
import FormulariosTab from "./MassRegistrationTabs/FormulariosTab";

export default function RegistroAtendimentoMassaModal({ open, onClose, user }) {
  const queryClient = useQueryClient();
  const [selectedWorkshops, setSelectedWorkshops] = useState([]);
  const [activeTab, setActiveTab] = useState("atendimento");
  const [formData, setFormData] = useState({
    tipo_atendimento: "acompanhamento_mensal",
    data_agendada: "",
    hora_agendada: "",
    duracao_minutos: 60,
    status: "agendado",
    google_meet_link: "",
    pauta: "",
    objetivos: "",
    observacoes: ""
  });

  const { data: workshops } = useQuery({
    queryKey: ['workshops-for-mass-registration'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    },
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedWorkshops.length === 0) {
        throw new Error("Selecione pelo menos um cliente");
      }
      if (!data.data_agendada || !data.hora_agendada) {
        throw new Error("Preencha data e horário");
      }

      const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`;
      
      const atendimentos = selectedWorkshops.map(workshop_id => ({
        workshop_id,
        tipo_atendimento: data.tipo_atendimento,
        status: data.status,
        consultor_id: user.id,
        consultor_nome: user.full_name,
        data_agendada: dataHora,
        duracao_minutos: data.duracao_minutos,
        google_meet_link: data.google_meet_link,
        pauta: data.pauta ? [{ titulo: data.pauta, descricao: "", tempo_estimado: 15 }] : [],
        objetivos: data.objetivos ? [data.objetivos] : [],
        observacoes_consultor: data.observacoes
      }));

      const results = await Promise.all(
        atendimentos.map(atendimento => 
          base44.entities.ConsultoriaAtendimento.create(atendimento)
        )
      );

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['consultoria-atendimentos']);
      queryClient.invalidateQueries(['todos-atendimentos']);
      toast.success(`${results.length} atendimentos criados com sucesso!`);
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao criar atendimentos: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.data_agendada || !formData.hora_agendada) {
      toast.error("Preencha data e horário");
      return;
    }
    if (selectedWorkshops.length === 0) {
      toast.error("Selecione destinatários");
      return;
    }
    createMutation.mutate(formData);
  };

  const handlePreviewPDF = () => {
    toast.info("Visualização de PDF - funcionalidade em desenvolvimento");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Registro em Massa
          </DialogTitle>
          <p className="text-sm text-gray-600">Crie atendimentos, configure destinatários, formulários e acompanhe relatórios</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="atendimento">Criar Atendimento</TabsTrigger>
              <TabsTrigger value="destinatarios">Configurar Destinatários</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              <TabsTrigger value="formularios">Formulários</TabsTrigger>
            </TabsList>

            <TabsContent value="atendimento" className="space-y-4 mt-4">
              <AtendimentoMassaForm 
                formData={formData} 
                onFormChange={setFormData}
                onPreviewPDF={handlePreviewPDF}
              />
            </TabsContent>

            <TabsContent value="destinatarios" className="space-y-4 mt-4">
              <ConfigurarDestinatarios 
                selectedIds={selectedWorkshops}
                onSelectionChange={setSelectedWorkshops}
                workshops={workshops || []}
              />
            </TabsContent>

            <TabsContent value="relatorios" className="space-y-4 mt-4">
              <RelatoriosTab />
            </TabsContent>

            <TabsContent value="formularios" className="space-y-4 mt-4">
              <FormulariosTab />
            </TabsContent>
          </Tabs>

          {/* Rodapé com ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              {activeTab === "atendimento" && (
                <span className="text-gray-500">Configure os dados do atendimento</span>
              )}
              {activeTab === "destinatarios" && (
                selectedWorkshops.length > 0 ? (
                  <span className="font-medium text-green-600">
                    ✓ {selectedWorkshops.length} cliente(s) selecionado(s)
                  </span>
                ) : (
                  <span className="text-gray-500">Selecione clientes para enviar</span>
                )
              )}
              {(activeTab === "relatorios" || activeTab === "formularios") && (
                <span className="text-gray-500"></span>
              )}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {activeTab === "atendimento" && (
                <Button
                  type="button"
                  onClick={() => setActiveTab("destinatarios")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Próximo
                </Button>
              )}
              {activeTab === "destinatarios" && (
                <Button
                  type="submit"
                  disabled={createMutation.isPending || selectedWorkshops.length === 0 || !formData.data_agendada || !formData.hora_agendada}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Criar e Enviar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Save, Loader2, AlertCircle, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MassAtaForm from "./MassRegistration/MassAtaForm";
import MassGroupSelector from "./MassRegistration/MassGroupSelector";
import MassReportView from "./MassRegistration/MassReportView";
import RegistrarAtendimentoFormMass from "./RegistrarAtendimentoFormMass";

export default function RegistroAtendimentoMassaModal({ open, onClose, user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ata");
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showFullForm, setShowFullForm] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
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

  // Zerar form ao avançar da aba "ata"
  useEffect(() => {
    if (activeTab !== "ata") {
      sessionStorage.removeItem("massReg_form");
    }
  }, [activeTab]);

  // Persistência em sessionStorage
  useEffect(() => {
    if (open && activeTab === "ata") {
      const savedForm = sessionStorage.getItem("massReg_form");
      if (savedForm) setFormData(JSON.parse(savedForm));
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (open && activeTab === "ata") {
      sessionStorage.setItem("massReg_form", JSON.stringify(formData));
    }
  }, [formData, open, activeTab]);

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
      if (selectedClients.length === 0) {
        throw new Error("Selecione pelo menos um cliente");
      }
      if (!data.data_agendada || !data.hora_agendada) {
        throw new Error("Preencha data e horário");
      }

      const dataHora = `${data.data_agendada}T${data.hora_agendada}:00`;

      // Validar conflitos ANTES de criar em massa
      try {
        const responseConflito = await base44.functions.invoke('verificarConflitoHorario', {
          consultor_id: user.id,
          data_agendada: dataHora
        });

        if (responseConflito.data.conflito) {
          throw new Error(`Já existe${responseConflito.data.quantidade > 1 ? 'm' : ''} ${responseConflito.data.quantidade} atendimento${responseConflito.data.quantidade > 1 ? 's' : ''} agendado${responseConflito.data.quantidade > 1 ? 's' : ''} para este horário. Escolha outro horário.`);
        }
      } catch (error) {
        if (error.message.includes("atendimento")) {
          throw error;
        }
        console.warn("Erro ao verificar conflitos, prosseguindo:", error);
      }

      const atendimentos = selectedClients.map(workshop_id => ({
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

      // Gerar ID sequencial do disparo
      const lastId = localStorage.getItem("lastDisparoId") || "0";
      const nextNumber = parseInt(lastId) + 1;
      localStorage.setItem("lastDisparoId", nextNumber.toString());
      const disparoId = `DP${String(nextNumber).padStart(3, "0")}`;

      // Buscar dados dos clientes
      const clientesData = await Promise.all(
        selectedClients.map(id => base44.entities.Workshop.get(id).catch(() => null))
      ).then(data => data.filter(Boolean));

      // Salvar registro do disparo no histórico
      await base44.entities.BatchDispatch.create({
        disparo_id: disparoId,
        workshop_id: user.workshop_id || user.id,
        consultor_id: user.id,
        consultor_nome: user.full_name,
        grupo_nome: `Lote ${new Date().toLocaleDateString("pt-BR")}`,
        tipo_atendimento: data.tipo_atendimento,
        data_agendada: data.data_agendada,
        hora_agendada: data.hora_agendada,
        duracao_minutos: data.duracao_minutos,
        status: data.status,
        total_clientes: selectedClients.length,
        clientes: clientesData.map(c => ({
          workshop_id: c.id,
          nome: c.name,
          cidade: c.city,
          plano: c.planoAtual
        })),
        pauta: data.pauta,
        objetivos: data.objetivos,
        observacoes: data.observacoes,
        atendimentos_criados: results.map(r => r.id)
      });

      // Limpar sessionStorage
      sessionStorage.removeItem("massReg_form");
      sessionStorage.removeItem("massReg_clients");

      return results;
    },
    onSuccess: (results) => {
        queryClient.invalidateQueries(['consultoria-atendimentos']);
        queryClient.invalidateQueries(['todos-atendimentos']);
        queryClient.invalidateQueries(['batch-dispatch-history']);

        // Limpar dados persistidos
        sessionStorage.removeItem("massReg_form");
        sessionStorage.removeItem("massReg_clients");

        // Resetar estado se não manter aberto
        if (!keepOpen) {
          setFormData({
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
          setSelectedClients([]);
          setSelectedGroupId(null);
          setActiveTab("ata");
          setShowFullForm(false);
          onClose();
        } else {
          // Manter aberto, apenas resetar clients e form
          setSelectedClients([]);
          setSelectedGroupId(null);
          setActiveTab("ata");
          setShowFullForm(false);
          toast.success(`${results.length} atendimentos criados! Modal aberta para novo lote.`);
        }

        if (!keepOpen) {
          toast.success(`${results.length} atendimentos criados com sucesso!`);
        }
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
    if (selectedClients.length === 0) {
      toast.error("Selecione destinatários");
      return;
    }
    createMutation.mutate(formData);
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ata">1. Configurar Ata</TabsTrigger>
              <TabsTrigger value="grupos">2. Configurar Grupos</TabsTrigger>
              <TabsTrigger value="relatorio">3. Relatório</TabsTrigger>
            </TabsList>

            <TabsContent value="ata" className="space-y-4 mt-4">
              {!showFullForm ? (
                <Button
                  type="button"
                  onClick={() => setShowFullForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Atendimento
                </Button>
              ) : (
                <RegistrarAtendimentoFormMass
                  formData={formData}
                  onFormChange={setFormData}
                  onClose={() => setShowFullForm(false)}
                  onSaveAndContinue={() => {
                    setShowFullForm(false);
                    setActiveTab("grupos");
                    toast.success("Atendimento configurado! Selecione os clientes.");
                  }}
                  user={user}
                />
              )}
            </TabsContent>

            <TabsContent value="grupos" className="space-y-4 mt-4">
              <MassGroupSelector
                selectedGroupId={selectedGroupId}
                onGroupSelect={setSelectedGroupId}
                selectedClients={selectedClients}
                onClientsChange={setSelectedClients}
              />
            </TabsContent>

            <TabsContent value="relatorio" className="space-y-4 mt-4">
              <MassReportView selectedClients={selectedClients} formData={formData} />
            </TabsContent>
          </Tabs>

          {/* Rodapé */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {!formData.data_agendada && <AlertCircle className="w-4 h-4 text-amber-500" />}
              {selectedClients.length === 0 && activeTab === "grupos" && <AlertCircle className="w-4 h-4 text-amber-500" />}
              <p className="text-sm text-gray-600">
                {activeTab === "ata" && "Preencha os dados da ata"}
                {activeTab === "grupos" && `${selectedClients.length} cliente(s) selecionado(s)`}
                {activeTab === "relatorio" && "Revise antes de enviar"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {activeTab === "ata" && (
                <Button
                  type="button"
                  onClick={() => setActiveTab("grupos")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Próximo
                </Button>
              )}
              {activeTab === "grupos" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("ata")}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("relatorio")}
                    disabled={selectedClients.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Próximo
                  </Button>
                </>
              )}
              {activeTab === "relatorio" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("grupos")}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || selectedClients.length === 0}
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
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
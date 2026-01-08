import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock, Target, Save, X, Filter, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegistroAtendimentoMassaModal({ open, onClose, user }) {
  const queryClient = useQueryClient();
  const [selectedWorkshops, setSelectedWorkshops] = useState([]);
  const [selectionMode, setSelectionMode] = useState("manual");
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

  const { data: planos = [] } = useQuery({
    queryKey: ['planos-disponiveis'],
    queryFn: () => base44.entities.Plan.list(),
    enabled: open
  });

  const toggleWorkshop = (workshopId) => {
    setSelectedWorkshops(prev => 
      prev.includes(workshopId) 
        ? prev.filter(id => id !== workshopId)
        : [...prev, workshopId]
    );
  };

  const selectByPlan = (planName) => {
    const workshopsPlano = workshops?.filter(w => w.planoAtual === planName).map(w => w.id) || [];
    setSelectedWorkshops(workshopsPlano);
    toast.success(`${workshopsPlano.length} clientes selecionados do plano ${planName}`);
  };

  const selectAll = () => {
    setSelectedWorkshops(workshops?.map(w => w.id) || []);
  };

  const clearSelection = () => {
    setSelectedWorkshops([]);
  };

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
    createMutation.mutate(formData);
  };

  const workshopsAgrupados = React.useMemo(() => {
    if (!workshops) return {};
    return workshops.reduce((acc, w) => {
      const plano = w.planoAtual || 'FREE';
      if (!acc[plano]) acc[plano] = [];
      acc[plano].push(w);
      return acc;
    }, {});
  }, [workshops]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Registro de Atendimento em Massa
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Crie o mesmo atendimento para múltiplos clientes simultaneamente
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={selectionMode} onValueChange={setSelectionMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Seleção Manual</TabsTrigger>
              <TabsTrigger value="plan">Por Plano</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedWorkshops.length} cliente(s) selecionado(s)
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                    Selecionar Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-auto border rounded-lg p-4">
                {workshops?.map((workshop) => (
                  <div
                    key={workshop.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleWorkshop(workshop.id)}
                  >
                    <Checkbox
                      checked={selectedWorkshops.includes(workshop.id)}
                      onCheckedChange={() => toggleWorkshop(workshop.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{workshop.name}</p>
                      <p className="text-xs text-gray-600">{workshop.city} - {workshop.state}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {workshop.planoAtual}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecione clientes agrupados por plano contratado
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(workshopsAgrupados).filter(p => p !== 'FREE').map((plano) => (
                  <Button
                    key={plano}
                    type="button"
                    variant="outline"
                    className="flex flex-col items-start p-4 h-auto"
                    onClick={() => selectByPlan(plano)}
                  >
                    <span className="font-bold text-lg">{plano}</span>
                    <span className="text-xs text-gray-600">
                      {workshopsAgrupados[plano].length} cliente(s)
                    </span>
                  </Button>
                ))}
              </div>

              {selectedWorkshops.length > 0 && (
                <div className="border rounded-lg p-4">
                  <p className="font-medium mb-3">Clientes Selecionados ({selectedWorkshops.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkshops.map(id => {
                      const w = workshops?.find(workshop => workshop.id === id);
                      return w ? (
                        <Badge key={id} variant="secondary" className="gap-2">
                          {w.name}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWorkshop(id);
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Dados do Atendimento */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dados do Atendimento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select
                  value={formData.tipo_atendimento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_atendimento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imersao">Imersão</SelectItem>
                    <SelectItem value="treinamento_grupo">Treinamento em Grupo</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
                    <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data_agendada}
                  onChange={(e) => setFormData({ ...formData, data_agendada: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.hora_agendada}
                  onChange={(e) => setFormData({ ...formData, hora_agendada: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={formData.duracao_minutos}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div>
              <Label>Google Meet (opcional)</Label>
              <Input
                placeholder="Link da reunião"
                value={formData.google_meet_link}
                onChange={(e) => setFormData({ ...formData, google_meet_link: e.target.value })}
              />
            </div>

            <div>
              <Label>Pauta Principal</Label>
              <Textarea
                placeholder="Tema principal do encontro..."
                value={formData.pauta}
                onChange={(e) => setFormData({ ...formData, pauta: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Objetivos Gerais</Label>
              <Textarea
                placeholder="Objetivos do atendimento em grupo..."
                value={formData.objetivos}
                onChange={(e) => setFormData({ ...formData, objetivos: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas gerais sobre o atendimento..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              {selectedWorkshops.length > 0 ? (
                <span className="font-medium text-blue-600">
                  {selectedWorkshops.length} atendimento(s) serão criados
                </span>
              ) : (
                "Nenhum cliente selecionado"
              )}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || selectedWorkshops.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <>Criando {selectedWorkshops.length} atendimentos...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Criar Atendimentos
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
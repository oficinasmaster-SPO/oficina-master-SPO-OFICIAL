import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, AlertTriangle, CheckCircle2, Clock, Users, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

export default function CapacidadeConsultoresTab({ user }) {
  const queryClient = useQueryClient();
  const [periodoSelecionado, setPeriodoSelecionado] = useState(format(new Date(), "yyyy-MM"));
  const [consultorSelecionado, setConsultorSelecionado] = useState("todos");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    consultor_id: "",
    capacidade_horas: 160,
    periodo_tipo: "mensal",
    modo_controle: "alertar"
  });

  // Buscar consultores internos
  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-internos'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.filter(e => e.is_internal === true || e.tipo_vinculo === 'interno');
    }
  });

  // Buscar capacidades configuradas
  const { data: capacidades = [] } = useQuery({
    queryKey: ['capacidades-consultores', periodoSelecionado],
    queryFn: async () => {
      const caps = await base44.entities.ConsultorCapacidade.list();
      return caps.filter(c => c.periodo_ref === periodoSelecionado && c.active);
    }
  });

  // Buscar atendimentos do período
  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-periodo', periodoSelecionado],
    queryFn: async () => {
      const startDate = startOfMonth(parseISO(periodoSelecionado + "-01"));
      const endDate = endOfMonth(parseISO(periodoSelecionado + "-01"));
      
      const all = await base44.entities.ConsultoriaAtendimento.list();
      return all.filter(a => {
        const dataRef = a.data_realizada || a.data_agendada;
        if (!dataRef) return false;
        const date = new Date(dataRef);
        return date >= startDate && date <= endDate;
      });
    }
  });

  // Buscar backlog do período
  const { data: backlog = [] } = useQuery({
    queryKey: ['backlog-periodo', periodoSelecionado],
    queryFn: async () => {
      const startDate = startOfMonth(parseISO(periodoSelecionado + "-01"));
      const endDate = endOfMonth(parseISO(periodoSelecionado + "-01"));
      
      const all = await base44.entities.TarefaBacklog.list();
      return all.filter(t => {
        const dataRef = t.data_conclusao || t.created_date;
        if (!dataRef) return false;
        const date = new Date(dataRef);
        return date >= startDate && date <= endDate;
      });
    }
  });

  // Mutation para salvar capacidade
  const saveCapacidadeMutation = useMutation({
    mutationFn: async (data) => {
      const existing = capacidades.find(c => c.consultor_id === data.consultor_id);
      
      const payload = {
        consultor_id: data.consultor_id,
        consultor_nome: consultores.find(c => c.user_id === data.consultor_id)?.full_name || "",
        periodo_tipo: data.periodo_tipo,
        periodo_ref: periodoSelecionado,
        capacidade_minutos: data.capacidade_horas * 60,
        reunioes_max_pct: 70,
        execucao_min_pct: 30,
        modo_controle: data.modo_controle,
        active: true
      };

      if (existing) {
        return await base44.entities.ConsultorCapacidade.update(existing.id, payload);
      } else {
        return await base44.entities.ConsultorCapacidade.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['capacidades-consultores']);
      toast.success("Capacidade configurada com sucesso!");
      setShowConfigModal(false);
      setConfigForm({ consultor_id: "", capacidade_horas: 160, periodo_tipo: "mensal", modo_controle: "alertar" });
    },
    onError: (error) => {
      toast.error("Erro ao salvar capacidade: " + error.message);
    }
  });

  // Calcular consumo por consultor
  const consumoPorConsultor = useMemo(() => {
    const resultado = {};

    consultores.forEach(consultor => {
      const consultorId = consultor.user_id;
      if (!consultorId) return;

      // Filtrar atendimentos deste consultor
      const atendConsultor = atendimentos.filter(a => a.consultor_id === consultorId);
      
      // Reuniões (minutos)
      const reunioes = atendConsultor
        .filter(a => {
          const tipo = (a.tipo_atendimento || "").toLowerCase();
          return tipo.includes("reuniao") || tipo.includes("reunião") || tipo.includes("meeting");
        })
        .reduce((sum, a) => sum + (a.duracao_real_minutos || a.duracao_minutos || 0), 0);

      // Atendimentos/Execução (minutos)
      const execucao = atendConsultor
        .filter(a => {
          const tipo = (a.tipo_atendimento || "").toLowerCase();
          return !tipo.includes("reuniao") && !tipo.includes("reunião") && !tipo.includes("meeting");
        })
        .reduce((sum, a) => sum + (a.duracao_real_minutos || a.duracao_minutos || 0), 0);

      // Backlog (converter horas → minutos)
      const backlogConsultor = backlog.filter(t => t.consultor_id === consultorId);
      const backlogMinutos = backlogConsultor.reduce((sum, t) => {
        const horas = t.tempo_real_horas || t.tempo_estimado_horas || 0;
        return sum + (horas * 60);
      }, 0);

      // Buscar capacidade configurada
      const capacidade = capacidades.find(c => c.consultor_id === consultorId);
      const capacidadeMinutos = capacidade?.capacidade_minutos || 9600; // default 160h

      const totalConsumido = reunioes + execucao + backlogMinutos;
      const pctReunioes = capacidadeMinutos > 0 ? (reunioes / capacidadeMinutos) * 100 : 0;
      const pctExecucao = capacidadeMinutos > 0 ? ((execucao + backlogMinutos) / capacidadeMinutos) * 100 : 0;

      // Alertas
      const alertas = [];
      if (pctReunioes > 70) {
        alertas.push({ tipo: "erro", msg: `Reuniões acima do limite (${pctReunioes.toFixed(1)}%)` });
      }
      if (pctExecucao < 30) {
        alertas.push({ tipo: "alerta", msg: `Execução abaixo do mínimo (${pctExecucao.toFixed(1)}%)` });
      }

      resultado[consultorId] = {
        consultor,
        capacidade: capacidadeMinutos,
        reunioes,
        execucao,
        backlog: backlogMinutos,
        totalConsumido,
        pctReunioes,
        pctExecucao,
        alertas,
        atendimentos: atendConsultor,
        tarefas: backlogConsultor
      };
    });

    return resultado;
  }, [consultores, atendimentos, backlog, capacidades]);

  const consultorAtual = consultorSelecionado === "todos" 
    ? null 
    : consumoPorConsultor[consultorSelecionado];

  const handleConfigOpen = (consultorId) => {
    const consultor = consultores.find(c => c.user_id === consultorId);
    const cap = capacidades.find(c => c.consultor_id === consultorId);
    
    setConfigForm({
      consultor_id: consultorId,
      capacidade_horas: cap ? cap.capacidade_minutos / 60 : 160,
      periodo_tipo: cap?.periodo_tipo || "mensal",
      modo_controle: cap?.modo_controle || "alertar"
    });
    setShowConfigModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Período</Label>
              <Input
                type="month"
                value={periodoSelecionado}
                onChange={(e) => setPeriodoSelecionado(e.target.value)}
              />
            </div>
            <div>
              <Label>Consultor</Label>
              <Select value={consultorSelecionado} onValueChange={setConsultorSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os consultores</SelectItem>
                  {consultores.map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {consultorSelecionado === "todos" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consultores.map(consultor => {
            const dados = consumoPorConsultor[consultor.user_id];
            if (!dados) return null;

            const temAlerta = dados.alertas.length > 0;

            return (
              <Card key={consultor.user_id} className={temAlerta ? "border-red-300" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{consultor.full_name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleConfigOpen(consultor.user_id)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Capacidade</span>
                      <span className="font-semibold">
                        {(dados.capacidade / 60).toFixed(0)}h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Consumido</span>
                      <span>{(dados.totalConsumido / 60).toFixed(1)}h</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Reuniões</span>
                      <Badge variant={dados.pctReunioes > 70 ? "destructive" : "secondary"}>
                        {dados.pctReunioes.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={dados.pctReunioes} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Execução + Backlog</span>
                      <Badge variant={dados.pctExecucao < 30 ? "destructive" : "secondary"}>
                        {dados.pctExecucao.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={dados.pctExecucao} className="h-2" />
                  </div>

                  {dados.alertas.length > 0 && (
                    <div className="space-y-1">
                      {dados.alertas.map((alerta, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3 mt-0.5" />
                          <span>{alerta.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setConsultorSelecionado(consultor.user_id)}
                  >
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : consultorAtual ? (
        <>
          {/* Resumo Detalhado do Consultor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {consultorAtual.consultor.full_name}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfigOpen(consultorSelecionado)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Capacidade
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {(consultorAtual.capacidade / 60).toFixed(0)}h
                  </div>
                  <div className="text-sm text-gray-600">Capacidade Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {(consultorAtual.reunioes / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">
                    Reuniões ({consultorAtual.pctReunioes.toFixed(1)}%)
                  </div>
                  {consultorAtual.pctReunioes > 70 && (
                    <Badge variant="destructive" className="mt-1">Acima do limite</Badge>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {(consultorAtual.execucao / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Atendimentos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {(consultorAtual.backlog / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Backlog</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">Reuniões (máx 70%)</span>
                    <span className={consultorAtual.pctReunioes > 70 ? "text-red-600 font-semibold" : ""}>
                      {consultorAtual.pctReunioes.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={consultorAtual.pctReunioes} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">Execução + Backlog (mín 30%)</span>
                    <span className={consultorAtual.pctExecucao < 30 ? "text-red-600 font-semibold" : ""}>
                      {consultorAtual.pctExecucao.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={consultorAtual.pctExecucao} className="h-3" />
                </div>
              </div>

              {consultorAtual.alertas.length > 0 && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 font-semibold text-red-900 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Alertas de Capacidade
                  </div>
                  <ul className="space-y-1">
                    {consultorAtual.alertas.map((alerta, idx) => (
                      <li key={idx} className="text-sm text-red-800">• {alerta.msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento por Itens */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="reunioes">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="reunioes">
                    Reuniões ({consultorAtual.atendimentos.filter(a => {
                      const tipo = (a.tipo_atendimento || "").toLowerCase();
                      return tipo.includes("reuniao") || tipo.includes("reunião") || tipo.includes("meeting");
                    }).length})
                  </TabsTrigger>
                  <TabsTrigger value="atendimentos">
                    Atendimentos ({consultorAtual.atendimentos.filter(a => {
                      const tipo = (a.tipo_atendimento || "").toLowerCase();
                      return !tipo.includes("reuniao") && !tipo.includes("reunião") && !tipo.includes("meeting");
                    }).length})
                  </TabsTrigger>
                  <TabsTrigger value="backlog">
                    Backlog ({consultorAtual.tarefas.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reunioes">
                  <div className="space-y-2">
                    {consultorAtual.atendimentos
                      .filter(a => {
                        const tipo = (a.tipo_atendimento || "").toLowerCase();
                        return tipo.includes("reuniao") || tipo.includes("reunião") || tipo.includes("meeting");
                      })
                      .map(atend => (
                        <div key={atend.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="font-medium">{atend.tipo_atendimento}</div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(atend.data_realizada || atend.data_agendada), "dd/MM/yyyy")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {((atend.duracao_real_minutos || atend.duracao_minutos || 0) / 60).toFixed(1)}h
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {atend.duracao_real_minutos || atend.duracao_minutos || 0} min
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="atendimentos">
                  <div className="space-y-2">
                    {consultorAtual.atendimentos
                      .filter(a => {
                        const tipo = (a.tipo_atendimento || "").toLowerCase();
                        return !tipo.includes("reuniao") && !tipo.includes("reunião") && !tipo.includes("meeting");
                      })
                      .map(atend => (
                        <div key={atend.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="font-medium">{atend.tipo_atendimento}</div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(atend.data_realizada || atend.data_agendada), "dd/MM/yyyy")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {((atend.duracao_real_minutos || atend.duracao_minutos || 0) / 60).toFixed(1)}h
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {atend.duracao_real_minutos || atend.duracao_minutos || 0} min
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="backlog">
                  <div className="space-y-2">
                    {consultorAtual.tarefas.map(tarefa => (
                      <div key={tarefa.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="font-medium">{tarefa.titulo}</div>
                          <div className="text-sm text-gray-600">{tarefa.cliente_nome}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {tarefa.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {(tarefa.tempo_real_horas || tarefa.tempo_estimado_horas || 0).toFixed(1)}h
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Modal de Configuração */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Capacidade do Consultor</DialogTitle>
            <DialogDescription>
              Defina a capacidade mensal e regras de controle 70/30
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Capacidade Mensal (horas)</Label>
              <Input
                type="number"
                value={configForm.capacidade_horas}
                onChange={(e) => setConfigForm({ ...configForm, capacidade_horas: parseFloat(e.target.value) })}
                placeholder="160"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: 160h/mês = 8h/dia × 20 dias úteis
              </p>
            </div>

            <div>
              <Label>Tipo de Período</Label>
              <Select
                value={configForm.periodo_tipo}
                onValueChange={(v) => setConfigForm({ ...configForm, periodo_tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modo de Controle</Label>
              <Select
                value={configForm.modo_controle}
                onValueChange={(v) => setConfigForm({ ...configForm, modo_controle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alertar">Apenas Alertar</SelectItem>
                  <SelectItem value="bloquear">Bloquear Agendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg space-y-2">
              <div className="font-semibold text-sm">Regra 70/30:</div>
              <div className="text-xs text-gray-700">
                • Máximo 70% em Reuniões<br />
                • Mínimo 30% em Execução + Backlog
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveCapacidadeMutation.mutate(configForm)}
              disabled={saveCapacidadeMutation.isPending}
            >
              {saveCapacidadeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Shield, Lock, Unlock, Settings, Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const AttendanceRulesTab = lazy(() => import("@/components/plans/AttendanceRulesTab"));
const VouchersTab = lazy(() => import("@/components/vouchers/VouchersTab"));

const ALL_FEATURES = {
  diagnosticos: [
    { id: "diagnostico_oficina", label: "Diagnóstico de Oficina (4 Fases)" },
    { id: "diagnostico_empresario", label: "Diagnóstico de Empreendedor" },
    { id: "diagnostico_maturidade", label: "Diagnóstico de Maturidade Colaborador" },
    { id: "diagnostico_producao", label: "Diagnóstico de Produtividade (TCMP2)" },
    { id: "diagnostico_desempenho", label: "Diagnóstico de Desempenho (Matriz 30 Critérios)" },
    { id: "diagnostico_carga", label: "Diagnóstico de Carga de Trabalho" },
    { id: "diagnostico_os", label: "Diagnóstico de Ordem de Serviço (R70/I30)" },
    { id: "diagnostico_disc", label: "Diagnóstico DISC Comportamental" },
    { id: "diagnostico_endividamento", label: "Diagnóstico de Endividamento" },
    { id: "diagnostico_gerencial", label: "Diagnóstico Gerencial" },
    { id: "diagnostico_comercial", label: "Diagnóstico Comercial" }
  ],
  gestao: [
    { id: "plano_acao", label: "Plano de Ação com IA" },
    { id: "gestao_colaboradores", label: "Gestão de Colaboradores" },
    { id: "gestao_metas", label: "Gestão de Metas e KPIs" },
    { id: "desdobramento_metas", label: "Desdobramento de Metas" },
    { id: "gestao_tarefas", label: "Gestão de Tarefas e Kanban" },
    { id: "gestao_oficina", label: "Gestão da Oficina Completa" },
    { id: "gestao_processos", label: "Gestão de Processos (MAPs)" },
    { id: "qgp_board", label: "QGP - Quadro Gestão à Vista Produção" }
  ],
  rh: [
    { id: "cdc_colaborador", label: "CDC - Compromisso de Desenvolvimento" },
    { id: "coex_contrato", label: "COEX - Contrato de Experiência" },
    { id: "descricoes_cargo", label: "Descrições de Cargo com IA" },
    { id: "monitoramento_rh", label: "Monitoramento de RH" },
    { id: "onboarding_planos", label: "Planos de Onboarding/Integração" },
    { id: "organograma", label: "Organograma Interativo" },
    { id: "convidar_colaboradores", label: "Sistema de Convites Colaboradores" }
  ],
  cultura: [
    { id: "missao_visao_valores", label: "Missão, Visão e Valores" },
    { id: "rituais_cultura", label: "Rituais de Cultura" },
    { id: "cultura_organizacional", label: "Cultura Organizacional" },
    { id: "pesquisa_clima", label: "Pesquisa de Clima Organizacional" },
    { id: "aculturacao", label: "Cronograma de Aculturação" }
  ],
  treinamento: [
    { id: "treinamento_vendas", label: "Treinamento de Vendas" },
    { id: "gestao_treinamentos", label: "Gestão de Treinamentos e Módulos" },
    { id: "acompanhamento_cursos", label: "Acompanhamento de Cursos" },
    { id: "certificados", label: "Sistema de Certificados" }
  ],
  aceleracao: [
    { id: "programa_aceleracao", label: "Programa de Aceleração" },
    { id: "cronograma_consultoria", label: "Cronograma de Consultoria" },
    { id: "registro_atendimentos", label: "Registro de Atendimentos" },
    { id: "atas_ia", label: "Atas de Reunião com IA" },
    { id: "painel_aceleracao", label: "Painel do Cliente Aceleração" },
    { id: "controle_aceleracao", label: "Controle da Aceleração (Consultor)" }
  ],
  financeiro: [
    { id: "dre_tcmp2", label: "DRE e TCMP2" },
    { id: "melhor_mes", label: "Registro Melhor Mês" },
    { id: "metas_financeiras", label: "Metas Financeiras (Mensal/Diária/Semanal)" }
  ],
  autoavaliacoes: [
    { id: "autoavaliacao_vendas", label: "Autoavaliação Vendas" },
    { id: "autoavaliacao_comercial", label: "Autoavaliação Comercial" },
    { id: "autoavaliacao_marketing", label: "Autoavaliação Marketing" },
    { id: "autoavaliacao_pessoas", label: "Autoavaliação Pessoas" },
    { id: "autoavaliacao_financeiro", label: "Autoavaliação Financeiro" },
    { id: "autoavaliacao_empresarial", label: "Autoavaliação Empresarial" },
    { id: "autoavaliacao_ma3", label: "Autoavaliação MA3" }
  ],
  gamificacao: [
    { id: "gamificacao", label: "Sistema de Gamificação" },
    { id: "desafios", label: "Desafios e Conquistas" },
    { id: "ranking", label: "Rankings Dinâmicos" },
    { id: "badges", label: "Sistema de Badges" },
    { id: "recompensas", label: "Mural de Recompensas" }
  ],
  analytics: [
    { id: "ia_analytics", label: "IA Analytics e Previsões" },
    { id: "ranking_brasil", label: "Ranking Brasil" },
    { id: "dashboard_avancado", label: "Dashboard Avançado" },
    { id: "historico", label: "Histórico de Diagnósticos" },
    { id: "relatorios", label: "Relatórios Personalizados" }
  ],
  documentos: [
    { id: "repositorio_documentos", label: "Repositório de Documentos" },
    { id: "manual_cultura", label: "Manual de Cultura" },
    { id: "manual_empresa", label: "Manual da Empresa" }
  ]
};

const ALL_MODULES = {
  principal: [
    { id: "Home", label: "Pagina Inicial" },
    { id: "Dashboard", label: "Dashboard Geral" },
    { id: "GestaoOficina", label: "Gestao da Oficina" }
  ],
  diagnosticos: [
    { id: "Questionario", label: "Questionario Diagnostico Oficina" },
    { id: "DiagnosticoEmpresario", label: "Diagnostico Empreendedor" },
    { id: "DiagnosticoMaturidade", label: "Diagnostico Maturidade" },
    { id: "DiagnosticoProducao", label: "Diagnostico Producao" },
    { id: "DiagnosticoDesempenho", label: "Diagnostico Desempenho" },
    { id: "DiagnosticoCarga", label: "Diagnostico Carga" },
    { id: "DiagnosticoOS", label: "Diagnostico OS" },
    { id: "DiagnosticoDISC", label: "Diagnostico DISC" },
    { id: "DiagnosticoEndividamento", label: "Diagnostico Endividamento" },
    { id: "DiagnosticoGerencial", label: "Diagnostico Gerencial" },
    { id: "DiagnosticoComercial", label: "Diagnostico Comercial" },
    { id: "Resultado", label: "Resultado Diagnostico" },
    { id: "Historico", label: "Historico Completo" }
  ],
  planoacao: [
    { id: "PlanoAcao", label: "Plano de Acao" },
    { id: "Tarefas", label: "Gestao de Tarefas" }
  ],
  rh: [
    { id: "Colaboradores", label: "Gestao de Colaboradores" },
    { id: "DetalhesColaborador", label: "Detalhes do Colaborador" },
    { id: "CadastroColaborador", label: "Cadastro de Colaborador" },
    { id: "DescricoesCargo", label: "Descricoes de Cargo" },
    { id: "CDCList", label: "Lista de CDC" },
    { id: "COEXList", label: "Lista de COEX" },
    { id: "MonitoramentoRH", label: "Monitoramento RH" },
    { id: "Organograma", label: "Organograma" },
    { id: "ConvidarColaborador", label: "Convidar Colaborador" }
  ],
  cultura: [
    { id: "MissaoVisaoValores", label: "Missao, Visao e Valores" },
    { id: "Rituais", label: "Rituais de Cultura" },
    { id: "CulturaOrganizacional", label: "Cultura Organizacional" },
    { id: "PesquisaClima", label: "Pesquisa de Clima" },
    { id: "CronogramaAculturacao", label: "Cronograma Aculturacao" }
  ],
  metas: [
    { id: "DRETCMP2", label: "DRE e TCMP2" },
    { id: "DesdobramentoMeta", label: "Desdobramento de Metas" },
    { id: "HistoricoMetas", label: "Historico de Metas" },
    { id: "ConsolidadoMensal", label: "Consolidado Mensal" }
  ],
  treinamento: [
    { id: "TreinamentoVendas", label: "Treinamento de Vendas" },
    { id: "GerenciarTreinamentos", label: "Gerenciar Treinamentos" },
    { id: "MeusTreinamentos", label: "Meus Treinamentos" },
    { id: "AcompanhamentoTreinamento", label: "Acompanhamento" }
  ],
  aceleracao: [
    { id: "PainelClienteAceleracao", label: "Painel Cliente" },
    { id: "CronogramaConsultoria", label: "Cronograma Consultoria" },
    { id: "RegistrarAtendimento", label: "Registrar Atendimento" },
    { id: "ControleAceleracao", label: "Controle Aceleracao" },
    { id: "CronogramaGeral", label: "Cronograma Geral" }
  ],
  autoavaliacoes: [
    { id: "SelecionarDiagnostico", label: "Selecionar Diagnostico" },
    { id: "AutoavaliacaoVendas", label: "Autoavaliacao Vendas" },
    { id: "AutoavaliacaoComercial", label: "Autoavaliacao Comercial" },
    { id: "AutoavaliacaoMarketing", label: "Autoavaliacao Marketing" },
    { id: "AutoavaliacaoPessoas", label: "Autoavaliacao Pessoas" },
    { id: "AutoavaliacaoFinanceiro", label: "Autoavaliacao Financeiro" },
    { id: "AutoavaliacaoEmpresarial", label: "Autoavaliacao Empresarial" },
    { id: "AutoavaliacaoMA3", label: "Autoavaliacao MA3" }
  ],
  processos: [
    { id: "GerenciarProcessos", label: "Gerenciar Processos" },
    { id: "MeusProcessos", label: "Meus Processos" },
    { id: "VisualizarProcesso", label: "Visualizar Processo" }
  ],
  producao: [
    { id: "QGPBoard", label: "QGP Board" },
    { id: "TechnicianQGP", label: "QGP Tecnico" },
    { id: "RegistroDiario", label: "Registro Diario Producao" },
    { id: "AdminProdutividade", label: "Admin Produtividade" }
  ],
  gamificacao: [
    { id: "Gamificacao", label: "Gamificacao" },
    { id: "AdminDesafios", label: "Admin Desafios" },
    { id: "GestaoDesafios", label: "Gestao de Desafios" },
    { id: "Feedbacks", label: "Feedbacks" }
  ],
  analytics: [
    { id: "IAAnalytics", label: "IA Analytics" },
    { id: "RankingBrasil", label: "Ranking Brasil" },
    { id: "DashboardOverview", label: "Dashboard Overview" }
  ],
  admin: [
    { id: "AdminClientes", label: "Admin Clientes" },
    { id: "Usuarios", label: "Usuarios" },
    { id: "GerenciarPlanos", label: "Gerenciar Planos" },
    { id: "GerenciarPermissoes", label: "Gerenciar Permissoes" },
    { id: "AdminNotificacoes", label: "Admin Notificacoes" },
    { id: "GerenciarToursVideos", label: "Tours e Videos" }
  ],
  documentos: [
    { id: "RepositorioDocumentos", label: "Repositorio Documentos" }
  ],
  cliente: [
    { id: "Clientes", label: "Lista de Clientes" },
    { id: "PortalColaborador", label: "Portal do Colaborador" },
    { id: "Notificacoes", label: "Notificacoes" }
  ]
};

const DEFAULT_PLANS = [
  { id: "FREE", name: "Gratis", color: "bg-gray-100" },
  { id: "START", name: "Start", color: "bg-blue-100" },
  { id: "BRONZE", name: "Bronze", color: "bg-orange-100" },
  { id: "PRATA", name: "Prata", color: "bg-slate-100" },
  { id: "GOLD", name: "Gold", color: "bg-yellow-100" },
  { id: "IOM", name: "IOM", color: "bg-purple-100" },
  { id: "MILLIONS", name: "Millions", color: "bg-pink-100" }
];

function newPlanTemplate(planId, planName, order) {
  return {
    plan_id: planId || "",
    plan_name: planName || "",
    plan_description: "",
    price_monthly: 0,
    price_annual: 0,
    price_display_monthly: "",
    price_display_annual: "",
    kiwify_checkout_url_monthly: "",
    kiwify_checkout_url_annual: "",
    features_highlights: [],
    features_allowed: [],
    features_blocked: [],
    modules_allowed: [],
    cronograma_features: [],
    cronograma_modules: [],
    extra_resources: "",
    limitations: "",
    max_diagnostics_per_month: -1,
    max_employees: -1,
    max_branches: -1,
    active: true,
    order: order || 0
  };
}

export default function GerenciarPlanos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(currentUser => {
      if (currentUser.role !== "admin") {
        toast.error("Acesso negado. Apenas administradores.");
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }).catch(() => {
      toast.error("Erro ao verificar permissoes");
      navigate(createPageUrl("Home"));
    });
  }, []);

  const { data: planFeatures = [], isLoading } = useQuery({
    queryKey: ["planFeatures"],
    queryFn: () => base44.entities.PlanFeature.list(),
    enabled: !loading
  });

  const { data: plansFromDB = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list(),
    enabled: !loading
  });

  const { data: usersByPlan = [] } = useQuery({
    queryKey: ["users-by-plan"],
    queryFn: () => base44.entities.Workshop.list("-created_date", 1000),
    enabled: !loading
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanFeature.create(data),
    onSuccess: (createdPlan) => {
      queryClient.invalidateQueries(["planFeatures"]);
      queryClient.invalidateQueries(["plans"]);
      toast.success("Plano criado com sucesso!");
      setSelectedPlan(createdPlan);
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanFeature.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["planFeatures"]);
      queryClient.invalidateQueries(["plans"]);
      toast.success("Plano atualizado com sucesso!");
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => base44.entities.PlanFeature.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries(["planFeatures"]);
      queryClient.invalidateQueries(["plans"]);
      toast.success("Plano deletado com sucesso!");
    }
  });

  const togglePlanActiveMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.PlanFeature.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planFeatures"] });
      toast.success("Disponibilidade do plano atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar disponibilidade do plano.");
    }
  });

  const plans = plansFromDB.length > 0
    ? plansFromDB.map(p => ({ id: p.id, name: p.name, color: p.color || "bg-gray-100" }))
    : DEFAULT_PLANS;

  const getUsersCountByPlan = (planId) => {
    return usersByPlan.filter(w => w.planoAtual === planId).length;
  };

  const handleEditPlan = (planId) => {
    const existing = planFeatures.find(p => p.plan_id === planId);
    if (existing) {
      setSelectedPlan({
        ...existing,
        cronograma_features: existing.cronograma_features || [],
        cronograma_modules: existing.cronograma_modules || []
      });
    } else {
      const planInfo = plans.find(p => p.id === planId);
      setSelectedPlan(newPlanTemplate(planId, planInfo?.name || ""));
    }
  };

  const handleCreateNewPlan = () => {
    setSelectedPlan(newPlanTemplate("", "", planFeatures.length));
  };

  const handleDeletePlan = (planId) => {
    if (!confirm("Tem certeza que deseja deletar este plano?")) return;
    deletePlanMutation.mutate(planId);
  };

  const handleSavePlan = () => {
    if (!selectedPlan.plan_id || !selectedPlan.plan_name) {
      toast.error("ID e Nome do plano sao obrigatorios");
      return;
    }
    if (selectedPlan.id) {
      updatePlanMutation.mutate({ id: selectedPlan.id, data: selectedPlan });
    } else {
      createPlanMutation.mutate(selectedPlan);
    }
  };

  const toggleFeature = (feature, type) => {
    setSelectedPlan(prev => {
      const list = prev[type] || [];
      const newList = list.includes(feature) ? list.filter(f => f !== feature) : [...list, feature];
      return { ...prev, [type]: newList };
    });
  };

  const toggleCronograma = (item, type) => {
    const field = type === "feature" ? "cronograma_features" : "cronograma_modules";
    setSelectedPlan(prev => {
      const list = prev[field] || [];
      const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
      return { ...prev, [field]: newList };
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Planos</h1>
            <p className="text-gray-600">Controle total sobre permissoes e recursos de cada plano</p>
          </div>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="vouchers">Vouchers e Promocoes</TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
              <VouchersTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="plans">
            {!selectedPlan ? (
              <PlansList
                planFeatures={planFeatures}
                plans={plans}
                getUsersCountByPlan={getUsersCountByPlan}
                onEdit={handleEditPlan}
                onSelect={setSelectedPlan}
                onDelete={handleDeletePlan}
                onCreate={handleCreateNewPlan}
                toggleActive={togglePlanActiveMutation}
                deletePending={deletePlanMutation.isPending}
              />
            ) : (
              <PlanEditor
                selectedPlan={selectedPlan}
                setSelectedPlan={setSelectedPlan}
                onSave={handleSavePlan}
                onCancel={() => setSelectedPlan(null)}
                toggleFeature={toggleFeature}
                toggleCronograma={toggleCronograma}
                saving={createPlanMutation.isPending || updatePlanMutation.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PlansList({ planFeatures, plans, getUsersCountByPlan, onEdit, onSelect, onDelete, onCreate, toggleActive, deletePending }) {
  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={onCreate} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Novo Plano
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planFeatures.map(plan => (
          <Card key={plan.id} className="border-2 hover:shadow-lg transition-all bg-white">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.plan_name}
                    <Badge className="bg-green-600 text-white">
                      <Settings className="w-3 h-3 mr-1" />
                      Configurado
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {plan.plan_description || "Sem descricao"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Disponivel</span>
                  <Switch
                    checked={plan.active !== false}
                    onCheckedChange={(checked) => toggleActive.mutate({ id: plan.id, active: checked })}
                    disabled={toggleActive.isPending}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <Lock className="w-4 h-4 inline mr-1" />
                  {plan.features_allowed?.length || 0} funcionalidades
                </p>
                <p className="text-gray-700">
                  <Unlock className="w-4 h-4 inline mr-1" />
                  {plan.modules_allowed?.length || 0} modulos
                </p>
                <p className="text-gray-700 font-medium">
                  Usuarios cadastrados: {getUsersCountByPlan(plan.plan_id)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onSelect(plan)} className="flex-1" variant="outline">
                  Editar
                </Button>
                <Button onClick={() => onDelete(plan.id)} variant="destructive" size="icon" disabled={deletePending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {plans
          .filter(p => !planFeatures.some(pf => pf.plan_id === p.id))
          .map(plan => (
            <Card key={plan.id} className={`${plan.color} border-2 hover:shadow-lg transition-all cursor-pointer opacity-60`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <Badge variant="outline">Nao configurado</Badge>
                </CardTitle>
                <CardDescription>Clique para configurar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">
                  Usuarios cadastrados: {getUsersCountByPlan(plan.id)}
                </p>
                <Button onClick={() => onEdit(plan.id)} className="w-full" variant="outline">
                  Configurar Plano
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </>
  );
}

function PlanEditor({ selectedPlan, setSelectedPlan, onSave, onCancel, toggleFeature, toggleCronograma, saving }) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Configurar Plano: {selectedPlan.plan_name}
          <Button variant="outline" onClick={onCancel}>Voltar</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Informacoes</TabsTrigger>
            <TabsTrigger value="features">Funcionalidades</TabsTrigger>
            <TabsTrigger value="modules">Modulos</TabsTrigger>
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="attendances">
              <Calendar className="w-4 h-4 mr-2" />
              Atendimentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div>
              <Label>ID do Plano (obrigatorio, unico)</Label>
              <Input
                value={selectedPlan.plan_id}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, plan_id: e.target.value.toUpperCase() })}
                placeholder="CUSTOM_PLAN"
                disabled={!!selectedPlan.id}
              />
              {selectedPlan.id && (
                <p className="text-xs text-gray-500 mt-1">ID nao pode ser alterado apos criacao</p>
              )}
            </div>
            <div>
              <Label>Nome do Plano</Label>
              <Input
                value={selectedPlan.plan_name}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, plan_name: e.target.value })}
                placeholder="Plano Premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preco Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedPlan.price_monthly || 0}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                  placeholder="197.00"
                />
              </div>
              <div>
                <Label>Preco Anual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedPlan.price_annual || 0}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, price_annual: parseFloat(e.target.value) || 0 })}
                  placeholder="1970.00"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <Label className="text-blue-900 font-semibold">Links de Checkout Kiwify</Label>
              <div>
                <Label className="text-sm">Checkout Mensal</Label>
                <Input
                  value={selectedPlan.kiwify_checkout_url_monthly || ""}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, kiwify_checkout_url_monthly: e.target.value })}
                  placeholder="https://pay.kiwify.com.br/..."
                />
              </div>
              <div>
                <Label className="text-sm">Checkout Anual</Label>
                <Input
                  value={selectedPlan.kiwify_checkout_url_annual || ""}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, kiwify_checkout_url_annual: e.target.value })}
                  placeholder="https://pay.kiwify.com.br/..."
                />
              </div>
            </div>
            <div>
              <Label>Ordem de Exibicao</Label>
              <Input
                type="number"
                value={selectedPlan.order || 0}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Menor numero aparece primeiro</p>
            </div>
            <div>
              <Label>Descricao do Plano</Label>
              <Textarea
                value={selectedPlan.plan_description}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, plan_description: e.target.value })}
                rows={3}
                placeholder="Descricao que aparecera para o usuario..."
              />
            </div>
            <div>
              <Label>Destaques do Plano (separados por linha, max 8)</Label>
              <Textarea
                value={selectedPlan.features_highlights?.join("\n") || ""}
                onChange={(e) => setSelectedPlan({
                  ...selectedPlan,
                  features_highlights: e.target.value.split("\n").filter(f => f.trim())
                })}
                rows={6}
                placeholder={"Diagnosticos ilimitados\nSuporte prioritario\nIA avancada"}
              />
              <p className="text-xs text-gray-500 mt-1">Cada linha sera um item com check verde no card do plano</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_popular"
                  checked={selectedPlan.is_popular || false}
                  onChange={(e) => setSelectedPlan({ ...selectedPlan, is_popular: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_popular" className="cursor-pointer">Marcar como Mais Popular</Label>
              </div>
              {selectedPlan.is_popular && (
                <div>
                  <Label>Texto do Badge</Label>
                  <Input
                    value={selectedPlan.badge_text || ""}
                    onChange={(e) => setSelectedPlan({ ...selectedPlan, badge_text: e.target.value })}
                    placeholder="Mais Popular"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="space-y-6">
              {Object.entries(ALL_FEATURES).map(([categoria, features]) => (
                <Card key={categoria}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize">{categoria.replace(/_/g, " ")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {features.map(feature => (
                        <div key={feature.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2 flex-1">
                            <Checkbox
                              checked={selectedPlan.features_allowed?.includes(feature.id)}
                              onCheckedChange={() => toggleFeature(feature.id, "features_allowed")}
                            />
                            <label className="text-sm cursor-pointer">{feature.label}</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Cronograma:</span>
                            <Checkbox
                              checked={selectedPlan.cronograma_features?.includes(feature.id)}
                              onCheckedChange={() => toggleCronograma(feature.id, "feature")}
                              disabled={!selectedPlan.features_allowed?.includes(feature.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <div className="space-y-6">
              {Object.entries(ALL_MODULES).map(([categoria, modules]) => (
                <Card key={categoria}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base capitalize">{categoria.replace(/_/g, " ")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {modules.map(mod => (
                        <div key={mod.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2 flex-1">
                            <Checkbox
                              checked={selectedPlan.modules_allowed?.includes(mod.id)}
                              onCheckedChange={() => toggleFeature(mod.id, "modules_allowed")}
                            />
                            <label className="text-sm cursor-pointer">{mod.label}</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Cronograma:</span>
                            <Checkbox
                              checked={selectedPlan.cronograma_modules?.includes(mod.id)}
                              onCheckedChange={() => toggleCronograma(mod.id, "module")}
                              disabled={!selectedPlan.modules_allowed?.includes(mod.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4">
            <div>
              <Label>Diagnosticos por Mes (-1 = ilimitado)</Label>
              <Input
                type="number"
                value={selectedPlan.max_diagnostics_per_month}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, max_diagnostics_per_month: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Maximo de Colaboradores (-1 = ilimitado)</Label>
              <Input
                type="number"
                value={selectedPlan.max_employees}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, max_employees: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Maximo de Filiais (-1 = ilimitado)</Label>
              <Input
                type="number"
                value={selectedPlan.max_branches}
                onChange={(e) => setSelectedPlan({ ...selectedPlan, max_branches: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedPlan.active}
                onCheckedChange={(checked) => setSelectedPlan({ ...selectedPlan, active: checked })}
              />
              <label className="text-sm font-medium">Plano Ativo</label>
            </div>
          </TabsContent>

          <TabsContent value="attendances">
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
              <AttendanceRulesTab
                planId={selectedPlan.plan_id}
                planName={selectedPlan.plan_name}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuracoes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
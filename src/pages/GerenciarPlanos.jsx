import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Shield, Lock, Unlock, Settings, Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import AttendanceRulesTab from "@/components/plans/AttendanceRulesTab";

export default function GerenciarPlanos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lista completa de funcionalidades do sistema organizadas por categoria
  const allFeatures = {
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

  const allModules = {
    principal: [
      { id: "Home", label: "Página Inicial" },
      { id: "Dashboard", label: "Dashboard Geral" },
      { id: "GestaoOficina", label: "Gestão da Oficina" }
    ],
    diagnosticos: [
      { id: "Questionario", label: "Questionário Diagnóstico Oficina" },
      { id: "DiagnosticoEmpresario", label: "Diagnóstico Empreendedor" },
      { id: "DiagnosticoMaturidade", label: "Diagnóstico Maturidade" },
      { id: "DiagnosticoProducao", label: "Diagnóstico Produção" },
      { id: "DiagnosticoDesempenho", label: "Diagnóstico Desempenho" },
      { id: "DiagnosticoCarga", label: "Diagnóstico Carga" },
      { id: "DiagnosticoOS", label: "Diagnóstico OS" },
      { id: "DiagnosticoDISC", label: "Diagnóstico DISC" },
      { id: "DiagnosticoEndividamento", label: "Diagnóstico Endividamento" },
      { id: "DiagnosticoGerencial", label: "Diagnóstico Gerencial" },
      { id: "DiagnosticoComercial", label: "Diagnóstico Comercial" },
      { id: "Resultado", label: "Resultado Diagnóstico" },
      { id: "Historico", label: "Histórico Completo" }
    ],
    planoacao: [
      { id: "PlanoAcao", label: "Plano de Ação" },
      { id: "Tarefas", label: "Gestão de Tarefas" }
    ],
    rh: [
      { id: "Colaboradores", label: "Gestão de Colaboradores" },
      { id: "DetalhesColaborador", label: "Detalhes do Colaborador" },
      { id: "CadastroColaborador", label: "Cadastro de Colaborador" },
      { id: "DescricoesCargo", label: "Descrições de Cargo" },
      { id: "CDCList", label: "Lista de CDC" },
      { id: "COEXList", label: "Lista de COEX" },
      { id: "MonitoramentoRH", label: "Monitoramento RH" },
      { id: "Organograma", label: "Organograma" },
      { id: "ConvidarColaborador", label: "Convidar Colaborador" }
    ],
    cultura: [
      { id: "MissaoVisaoValores", label: "Missão, Visão e Valores" },
      { id: "Rituais", label: "Rituais de Cultura" },
      { id: "CulturaOrganizacional", label: "Cultura Organizacional" },
      { id: "PesquisaClima", label: "Pesquisa de Clima" },
      { id: "CronogramaAculturacao", label: "Cronograma Aculturação" }
    ],
    metas: [
      { id: "DRETCMP2", label: "DRE e TCMP2" },
      { id: "DesdobramentoMeta", label: "Desdobramento de Metas" },
      { id: "HistoricoMetas", label: "Histórico de Metas" },
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
      { id: "ControleAceleracao", label: "Controle Aceleração" },
      { id: "CronogramaGeral", label: "Cronograma Geral" }
    ],
    autoavaliacoes: [
      { id: "SelecionarDiagnostico", label: "Selecionar Diagnóstico" },
      { id: "AutoavaliacaoVendas", label: "Autoavaliação Vendas" },
      { id: "AutoavaliacaoComercial", label: "Autoavaliação Comercial" },
      { id: "AutoavaliacaoMarketing", label: "Autoavaliação Marketing" },
      { id: "AutoavaliacaoPessoas", label: "Autoavaliação Pessoas" },
      { id: "AutoavaliacaoFinanceiro", label: "Autoavaliação Financeiro" },
      { id: "AutoavaliacaoEmpresarial", label: "Autoavaliação Empresarial" },
      { id: "AutoavaliacaoMA3", label: "Autoavaliação MA3" }
    ],
    processos: [
      { id: "GerenciarProcessos", label: "Gerenciar Processos" },
      { id: "MeusProcessos", label: "Meus Processos" },
      { id: "VisualizarProcesso", label: "Visualizar Processo" }
    ],
    producao: [
      { id: "QGPBoard", label: "QGP Board" },
      { id: "TechnicianQGP", label: "QGP Técnico" },
      { id: "RegistroDiario", label: "Registro Diário Produção" },
      { id: "AdminProdutividade", label: "Admin Produtividade" }
    ],
    gamificacao: [
      { id: "Gamificacao", label: "Gamificação" },
      { id: "AdminDesafios", label: "Admin Desafios" },
      { id: "GestaoDesafios", label: "Gestão de Desafios" },
      { id: "Feedbacks", label: "Feedbacks" }
    ],
    analytics: [
      { id: "IAAnalytics", label: "IA Analytics" },
      { id: "RankingBrasil", label: "Ranking Brasil" },
      { id: "DashboardOverview", label: "Dashboard Overview" }
    ],
    admin: [
      { id: "AdminClientes", label: "Admin Clientes" },
      { id: "Usuarios", label: "Usuários" },
      { id: "GerenciarPlanos", label: "Gerenciar Planos" },
      { id: "GerenciarPermissoes", label: "Gerenciar Permissões" },
      { id: "AdminNotificacoes", label: "Admin Notificações" },
      { id: "GerenciarToursVideos", label: "Tours e Vídeos" }
    ],
    documentos: [
      { id: "RepositorioDocumentos", label: "Repositório Documentos" }
    ],
    cliente: [
      { id: "Clientes", label: "Lista de Clientes" },
      { id: "PortalColaborador", label: "Portal do Colaborador" },
      { id: "Notificacoes", label: "Notificações" }
    ]
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      toast.error("Erro ao verificar permissões");
      navigate(createPageUrl("Home"));
    }
  };

  const { data: planFeatures = [], isLoading } = useQuery({
    queryKey: ['planFeatures'],
    queryFn: () => base44.entities.PlanFeature.list(),
    enabled: !loading
  });

  const { data: plansFromDB = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
    enabled: !loading
  });

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanFeature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planFeatures']);
      queryClient.invalidateQueries(['plans']);
      toast.success("Plano criado com sucesso!");
      setSelectedPlan(null);
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanFeature.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planFeatures']);
      queryClient.invalidateQueries(['plans']);
      toast.success("Plano atualizado com sucesso!");
      setSelectedPlan(null);
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => base44.entities.PlanFeature.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries(['planFeatures']);
      queryClient.invalidateQueries(['plans']);
      toast.success("Plano deletado com sucesso!");
    }
  });

  // Usar planos do banco de dados, com fallback para lista padrão
  const defaultPlans = [
    { id: "FREE", name: "Grátis", color: "bg-gray-100" },
    { id: "START", name: "Start", color: "bg-blue-100" },
    { id: "BRONZE", name: "Bronze", color: "bg-orange-100" },
    { id: "PRATA", name: "Prata", color: "bg-slate-100" },
    { id: "GOLD", name: "Gold", color: "bg-yellow-100" },
    { id: "IOM", name: "IOM", color: "bg-purple-100" },
    { id: "MILLIONS", name: "Millions", color: "bg-pink-100" }
  ];

  const plans = plansFromDB.length > 0 
    ? plansFromDB.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color || "bg-gray-100"
      }))
    : defaultPlans;

  const handleEditPlan = (planId) => {
    const existing = planFeatures.find(p => p.plan_id === planId);
    if (existing) {
      setSelectedPlan(existing);
    } else {
      const planInfo = plans.find(p => p.id === planId);
      setSelectedPlan({
        plan_id: planId,
        plan_name: planInfo?.name || "",
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
        order: 0
      });
    }
  };

  const handleCreateNewPlan = () => {
    setSelectedPlan({
      plan_id: "",
      plan_name: "",
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
      order: planFeatures.length
    });
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm("Tem certeza que deseja deletar este plano? Esta ação não pode ser desfeita.")) {
      return;
    }
    deletePlanMutation.mutate(planId);
  };

  const handleSavePlan = () => {
    if (selectedPlan.id) {
      updatePlanMutation.mutate({ id: selectedPlan.id, data: selectedPlan });
    } else {
      createPlanMutation.mutate(selectedPlan);
    }
  };

  const toggleFeature = (feature, type) => {
    setSelectedPlan(prev => {
      const list = prev[type] || [];
      const newList = list.includes(feature)
        ? list.filter(f => f !== feature)
        : [...list, feature];
      return { ...prev, [type]: newList };
    });
  };

  const toggleCronograma = (item, type) => {
    const field = type === 'feature' ? 'cronograma_features' : 'cronograma_modules';
    setSelectedPlan(prev => {
      const list = prev[field] || [];
      const newList = list.includes(item)
        ? list.filter(i => i !== item)
        : [...list, item];
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
            <p className="text-gray-600">Controle total sobre permissões e recursos de cada plano</p>
          </div>
        </div>

        {!selectedPlan ? (
          <>
            <div className="flex justify-end mb-6">
              <Button 
                onClick={handleCreateNewPlan}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Novo Plano
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Planos configurados (do banco) */}
              {planFeatures.map(plan => (
                <Card key={plan.id} className="border-2 hover:shadow-lg transition-all bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.plan_name}
                      <Badge className="bg-green-600 text-white">
                        <Settings className="w-3 h-3 mr-1" />
                        Configurado
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {plan.plan_description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <Lock className="w-4 h-4 inline mr-1" />
                        {plan.features_allowed?.length || 0} funcionalidades
                      </p>
                      <p className="text-gray-700">
                        <Unlock className="w-4 h-4 inline mr-1" />
                        {plan.modules_allowed?.length || 0} módulos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setSelectedPlan(plan)} 
                        className="flex-1"
                        variant="outline"
                      >
                        Editar
                      </Button>
                      <Button 
                        onClick={() => handleDeletePlan(plan.id)}
                        variant="destructive"
                        size="icon"
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Planos padrão não configurados */}
              {plans
                .filter(p => !planFeatures.some(pf => pf.plan_id === p.id))
                .map(plan => (
                  <Card key={plan.id} className={`${plan.color} border-2 hover:shadow-lg transition-all cursor-pointer opacity-60`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        <Badge variant="outline">Não configurado</Badge>
                      </CardTitle>
                      <CardDescription>
                        Clique para configurar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => handleEditPlan(plan.id)} className="w-full" variant="outline">
                        Configurar Plano
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </>
        ) : (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Configurar Plano: {selectedPlan.plan_name}
                <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                  Voltar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="features">Funcionalidades</TabsTrigger>
                  <TabsTrigger value="modules">Módulos</TabsTrigger>
                  <TabsTrigger value="limits">Limites</TabsTrigger>
                  <TabsTrigger value="attendances">
                    <Calendar className="w-4 h-4 mr-2" />
                    Atendimentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <div>
                    <Label>ID do Plano (obrigatório, único)</Label>
                    <Input
                      value={selectedPlan.plan_id}
                      onChange={(e) => setSelectedPlan({...selectedPlan, plan_id: e.target.value.toUpperCase()})}
                      placeholder="CUSTOM_PLAN"
                      disabled={!!selectedPlan.id}
                    />
                    {selectedPlan.id && (
                      <p className="text-xs text-gray-500 mt-1">ID não pode ser alterado após criação</p>
                    )}
                  </div>
                  <div>
                    <Label>Nome do Plano</Label>
                    <Input
                      value={selectedPlan.plan_name}
                      onChange={(e) => setSelectedPlan({...selectedPlan, plan_name: e.target.value})}
                      placeholder="Plano Premium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Preço Mensal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selectedPlan.price_monthly || 0}
                        onChange={(e) => setSelectedPlan({...selectedPlan, price_monthly: parseFloat(e.target.value) || 0})}
                        placeholder="197.00"
                      />
                    </div>
                    <div>
                      <Label>Preço Anual (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={selectedPlan.price_annual || 0}
                        onChange={(e) => setSelectedPlan({...selectedPlan, price_annual: parseFloat(e.target.value) || 0})}
                        placeholder="1970.00"
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <Label className="text-blue-900 font-semibold">🔗 Links de Checkout Kiwify</Label>
                    <div>
                      <Label className="text-sm">Checkout Mensal</Label>
                      <Input
                        value={selectedPlan.kiwify_checkout_url_monthly || ''}
                        onChange={(e) => setSelectedPlan({...selectedPlan, kiwify_checkout_url_monthly: e.target.value})}
                        placeholder="https://pay.kiwify.com.br/..."
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Checkout Anual</Label>
                      <Input
                        value={selectedPlan.kiwify_checkout_url_annual || ''}
                        onChange={(e) => setSelectedPlan({...selectedPlan, kiwify_checkout_url_annual: e.target.value})}
                        placeholder="https://pay.kiwify.com.br/..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição do Plano</Label>
                    <Textarea
                      value={selectedPlan.plan_description}
                      onChange={(e) => setSelectedPlan({...selectedPlan, plan_description: e.target.value})}
                      rows={3}
                      placeholder="Descrição que aparecerá para o usuário..."
                    />
                  </div>
                  <div>
                    <Label>Recursos Extras</Label>
                    <Textarea
                      value={selectedPlan.extra_resources}
                      onChange={(e) => setSelectedPlan({...selectedPlan, extra_resources: e.target.value})}
                      rows={3}
                      placeholder="Recursos exclusivos deste plano..."
                    />
                  </div>
                  <div>
                    <Label>Limitações</Label>
                    <Textarea
                      value={selectedPlan.limitations}
                      onChange={(e) => setSelectedPlan({...selectedPlan, limitations: e.target.value})}
                      rows={3}
                      placeholder="Limitações deste plano..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-6">
                  <div className="space-y-6">
                    {Object.entries(allFeatures).map(([categoria, features]) => (
                      <Card key={categoria}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base capitalize">
                            {categoria.replace(/_/g, ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {features.map(feature => (
                              <div key={feature.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-2 flex-1">
                                  <Checkbox
                                    checked={selectedPlan.features_allowed?.includes(feature.id)}
                                    onCheckedChange={() => toggleFeature(feature.id, 'features_allowed')}
                                  />
                                  <label className="text-sm cursor-pointer">
                                    {feature.label}
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Cronograma:</span>
                                  <Checkbox
                                    checked={selectedPlan.cronograma_features?.includes(feature.id)}
                                    onCheckedChange={() => toggleCronograma(feature.id, 'feature')}
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
                    {Object.entries(allModules).map(([categoria, modules]) => (
                      <Card key={categoria}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base capitalize">
                            {categoria.replace(/_/g, ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {modules.map(module => (
                              <div key={module.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center space-x-2 flex-1">
                                  <Checkbox
                                    checked={selectedPlan.modules_allowed?.includes(module.id)}
                                    onCheckedChange={() => toggleFeature(module.id, 'modules_allowed')}
                                  />
                                  <label className="text-sm cursor-pointer">
                                    {module.label}
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Cronograma:</span>
                                  <Checkbox
                                    checked={selectedPlan.cronograma_modules?.includes(module.id)}
                                    onCheckedChange={() => toggleCronograma(module.id, 'module')}
                                    disabled={!selectedPlan.modules_allowed?.includes(module.id)}
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
                    <Label>Diagnósticos por Mês (-1 = ilimitado)</Label>
                    <Input
                      type="number"
                      value={selectedPlan.max_diagnostics_per_month}
                      onChange={(e) => setSelectedPlan({...selectedPlan, max_diagnostics_per_month: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Máximo de Colaboradores (-1 = ilimitado)</Label>
                    <Input
                      type="number"
                      value={selectedPlan.max_employees}
                      onChange={(e) => setSelectedPlan({...selectedPlan, max_employees: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Máximo de Filiais (-1 = ilimitado)</Label>
                    <Input
                      type="number"
                      value={selectedPlan.max_branches}
                      onChange={(e) => setSelectedPlan({...selectedPlan, max_branches: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedPlan.active}
                      onCheckedChange={(checked) => setSelectedPlan({...selectedPlan, active: checked})}
                    />
                    <label className="text-sm font-medium">Plano Ativo</label>
                  </div>
                </TabsContent>

                <TabsContent value="attendances">
                  <AttendanceRulesTab 
                    planId={selectedPlan.plan_id} 
                    planName={selectedPlan.plan_name}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSavePlan}
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
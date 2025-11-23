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
import { Loader2, Save, Shield, Lock, Unlock, Settings } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function GerenciarPlanos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lista completa de funcionalidades do sistema
  const allFeatures = [
    "diagnostico_oficina",
    "diagnostico_empresario",
    "diagnostico_maturidade",
    "diagnostico_producao",
    "diagnostico_desempenho",
    "diagnostico_carga",
    "diagnostico_os",
    "diagnostico_disc",
    "diagnostico_endividamento",
    "diagnostico_gerencial",
    "diagnostico_comercial",
    "plano_acao",
    "gestao_colaboradores",
    "gestao_metas",
    "desdobramento_metas",
    "gestao_tarefas",
    "gestao_oficina",
    "missao_visao_valores",
    "rituais_cultura",
    "cultura_organizacional",
    "cdc_colaborador",
    "coex_contrato",
    "descricoes_cargo",
    "gamificacao",
    "ia_analytics",
    "ranking_brasil",
    "dashboard_avancado",
    "autoavaliacoes",
    "treinamento_vendas",
    "pesquisa_clima",
    "monitoramento_rh"
  ];

  const allModules = [
    "Home",
    "Dashboard",
    "Questionario",
    "Resultado",
    "PlanoAcao",
    "Historico",
    "Colaboradores",
    "GestaoMetas",
    "Tarefas",
    "GestaoOficina",
    "Rituais",
    "MissaoVisaoValores",
    "CulturaOrganizacional",
    "DescricoesCargo",
    "Gamificacao",
    "IAAnalytics",
    "RankingBrasil",
    "Autoavaliacoes",
    "TreinamentoVendas",
    "PesquisaClima",
    "MonitoramentoRH"
  ];

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

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanFeature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planFeatures']);
      toast.success("Plano criado com sucesso!");
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanFeature.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planFeatures']);
      toast.success("Plano atualizado com sucesso!");
      setSelectedPlan(null);
    }
  });

  const plans = [
    { id: "FREE", name: "Grátis", color: "bg-gray-100" },
    { id: "START", name: "Start", color: "bg-blue-100" },
    { id: "BRONZE", name: "Bronze", color: "bg-orange-100" },
    { id: "PRATA", name: "Prata", color: "bg-slate-100" },
    { id: "GOLD", name: "Gold", color: "bg-yellow-100" },
    { id: "IOM", name: "IOM", color: "bg-purple-100" },
    { id: "MILLIONS", name: "Millions", color: "bg-pink-100" }
  ];

  const handleEditPlan = (planId) => {
    const existing = planFeatures.find(p => p.plan_id === planId);
    if (existing) {
      setSelectedPlan(existing);
    } else {
      const planInfo = plans.find(p => p.id === planId);
      setSelectedPlan({
        plan_id: planId,
        plan_name: planInfo.name,
        plan_description: "",
        price: "",
        features_allowed: [],
        features_blocked: [],
        modules_allowed: [],
        extra_resources: "",
        limitations: "",
        max_diagnostics_per_month: -1,
        max_employees: -1,
        max_branches: -1,
        active: true
      });
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => {
              const existing = planFeatures.find(p => p.plan_id === plan.id);
              return (
                <Card key={plan.id} className={`${plan.color} border-2 hover:shadow-lg transition-all cursor-pointer`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {existing ? (
                        <Badge className="bg-green-600 text-white">
                          <Settings className="w-3 h-3 mr-1" />
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não configurado</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {existing ? existing.plan_description : "Clique para configurar"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleEditPlan(plan.id)} className="w-full">
                      {existing ? "Editar Configurações" : "Configurar Plano"}
                    </Button>
                    {existing && (
                      <div className="mt-4 space-y-2 text-sm">
                        <p className="text-gray-700">
                          <Lock className="w-4 h-4 inline mr-1" />
                          {existing.features_allowed?.length || 0} funcionalidades permitidas
                        </p>
                        <p className="text-gray-700">
                          <Unlock className="w-4 h-4 inline mr-1" />
                          {existing.modules_allowed?.length || 0} módulos liberados
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="features">Funcionalidades</TabsTrigger>
                  <TabsTrigger value="modules">Módulos</TabsTrigger>
                  <TabsTrigger value="limits">Limites</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <div>
                    <Label>Nome do Plano</Label>
                    <Input
                      value={selectedPlan.plan_name}
                      onChange={(e) => setSelectedPlan({...selectedPlan, plan_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Preço</Label>
                    <Input
                      value={selectedPlan.price}
                      onChange={(e) => setSelectedPlan({...selectedPlan, price: e.target.value})}
                      placeholder="R$ 197/mês"
                    />
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

                <TabsContent value="features" className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Funcionalidades Permitidas</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {allFeatures.map(feature => (
                        <div key={feature} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedPlan.features_allowed?.includes(feature)}
                            onCheckedChange={() => toggleFeature(feature, 'features_allowed')}
                          />
                          <label className="text-sm cursor-pointer">
                            {feature.replace(/_/g, ' ').toUpperCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="modules" className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Módulos/Páginas Permitidos</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {allModules.map(module => (
                        <div key={module} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedPlan.modules_allowed?.includes(module)}
                            onCheckedChange={() => toggleFeature(module, 'modules_allowed')}
                          />
                          <label className="text-sm cursor-pointer">
                            {module}
                          </label>
                        </div>
                      ))}
                    </div>
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
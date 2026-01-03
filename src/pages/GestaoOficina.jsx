import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Settings, Target, FileText, Users, TrendingUp, Package, DollarSign, BarChart3, Calculator, MessageCircle, Trophy, Briefcase, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "../components/utils/formatters";
import DadosBasicosOficina from "../components/workshop/DadosBasicosOficina";
import ServicosEquipamentos from "../components/workshop/ServicosEquipamentos";
import EquipamentosCompletos from "../components/workshop/EquipamentosCompletos";
import ServicosTerceirizados from "../components/workshop/ServicosTerceirizados";
import MetasObjetivosCompleto from "../components/workshop/MetasObjetivosCompleto";
import CulturaOrganizacional from "../components/workshop/CulturaOrganizacional";
import DocumentosProcessos from "../components/workshop/DocumentosProcessos";
import WorkshopLevelBadge from "../components/gamification/WorkshopLevelBadge";

import GrowthDashboard from "../components/management/GrowthDashboard";
import WorkshopMilestones from "../components/management/WorkshopMilestones";


export default function GestaoOficina() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [workshopGameProfile, setWorkshopGameProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [tcmp2Value, setTcmp2Value] = useState(0);
  const [loadingTcmp2, setLoadingTcmp2] = useState(true);
  const [isAdminViewing, setIsAdminViewing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let workshopToDisplay = null;
      
      // Verifica se há um workshop_id na URL (admin acessando backoffice do cliente)
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      
      if (adminWorkshopId && currentUser.role === 'admin') {
        // Admin visualizando oficina específica
        try {
          workshopToDisplay = await base44.entities.Workshop.get(adminWorkshopId);
          setIsAdminViewing(true);
          toast.info(`Visualizando backoffice de: ${workshopToDisplay.name}`);
        } catch (error) {
          console.log("Error fetching admin workshop:", error);
          toast.error("Erro ao carregar oficina");
        }
      } else {
        // Fluxo normal do usuário
        try {
          // 1. Buscar oficinas onde o usuário é dono
          const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });

          if (ownedWorkshops && ownedWorkshops.length > 0) {
            workshopToDisplay = ownedWorkshops[0];
          } else {
            // 2. Se não é dono, verifica se é colaborador
            const employees = await base44.entities.Employee.filter({ email: currentUser.email, status: 'ativo' });
            const myEmployeeRecord = employees && employees.length > 0 ? employees[0] : null;
            
            if (myEmployeeRecord && myEmployeeRecord.workshop_id) {
               const employeeWorkshop = await base44.entities.Workshop.get(myEmployeeRecord.workshop_id);
               workshopToDisplay = employeeWorkshop;
            }
          }
        } catch (workshopError) {
          console.log("Error fetching workshops:", workshopError);
        }
      }

      if (!workshopToDisplay) {
        setLoading(false);
        return;
      }

      setWorkshop(workshopToDisplay);
      
      // Carregar TCMP2
      loadTcmp2(workshopToDisplay.id);
      
      // Carregar Perfil de Jogo da Oficina
      try {
        const profiles = await base44.entities.WorkshopGameProfile.filter({ workshop_id: workshopToDisplay.id });
        if (profiles && profiles.length > 0) {
          setWorkshopGameProfile(profiles[0]);
        } else {
          // Criar perfil padrão se não existir (opcional, mas bom para garantir UI)
          const newProfile = await base44.entities.WorkshopGameProfile.create({
            workshop_id: workshopToDisplay.id,
            level: 1,
            level_name: 'Iniciante',
            xp: 0
          });
          setWorkshopGameProfile(newProfile);
        }
      } catch (e) {
        console.log("Error loading game profile:", e);
      }
      
    } catch (error) {
      console.log("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTcmp2 = async (workshopId) => {
    setLoadingTcmp2(true);
    try {
      // Primeiro tentar puxar do DRE (prioridade)
      const currentMonth = new Date().toISOString().substring(0, 7);
      const dres = await base44.entities.DREMonthly.filter({ 
        workshop_id: workshopId,
        month: currentMonth
      });

      if (dres && dres.length > 0 && dres[0].calculated?.tcmp2_value > 0) {
        setTcmp2Value(dres[0].calculated.tcmp2_value);
        setLoadingTcmp2(false);
        return;
      }

      // Se não tiver DRE, buscar de diagnósticos de OS (fallback)
      const osAssessments = await base44.entities.ServiceOrderDiagnostic.filter(
        { workshop_id: workshopId },
        '-created_date',
        10
      );
      
      const assessmentsArray = Array.isArray(osAssessments) ? osAssessments : [];
      if (assessmentsArray.length > 0) {
        const validAssessments = assessmentsArray.filter(os => os?.ideal_hour_value > 0);
        if (validAssessments.length > 0) {
          const avgTcmp2 = validAssessments.reduce((sum, os) => sum + os.ideal_hour_value, 0) / validAssessments.length;
          setTcmp2Value(avgTcmp2);
        }
      }
    } catch (error) {
      console.log("Error loading TCMP2:", error);
    } finally {
      setLoadingTcmp2(false);
    }
  };

  const handleUpdate = async (data) => {
    try {
      const updatedWorkshop = await base44.entities.Workshop.update(workshop.id, data);
      setWorkshop(updatedWorkshop);
      toast.success("Oficina atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Nenhuma oficina encontrada</p>
          <Button onClick={() => navigate(createPageUrl("Cadastro"))}>
            Cadastrar Oficina
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Banner de Admin Visualizando */}
        {isAdminViewing && (
          <div className="bg-purple-600 text-white rounded-lg shadow-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"></div>
              <span className="font-semibold">
                🔍 Modo Admin: Visualizando backoffice do cliente
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.history.back();
              }}
              className="bg-white text-purple-700 hover:bg-purple-50"
            >
              Voltar para Gestão de Usuários
            </Button>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{workshop.name}</h1>
              <p className="text-lg text-gray-600 mt-1">
                {workshop.city} - {workshop.state}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {workshop.segment}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  Maturidade Nível {workshop.maturity_level || 1}
                </span>
                {workshop.is_autocenter && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Auto Center
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
                {workshopGameProfile && (
                    <div className="w-64">
                        <WorkshopLevelBadge 
                            level={workshopGameProfile.level} 
                            levelName={workshopGameProfile.level_name}
                            xp={workshopGameProfile.xp}
                        />
                    </div>
                )}
                {!workshopGameProfile && (
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Engajamento</p>
                        <p className="text-2xl font-bold text-blue-600">{workshop.engagement_score || 0}%</p>
                    </div>
                )}
            </div>
          </div>
          
          {/* TCMP² Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Calculator className="w-5 h-5" />
                TCMP² - Valor Hora Ideal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  {loadingTcmp2 ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                      <span className="text-sm text-gray-600">Calculando...</span>
                    </div>
                  ) : tcmp2Value > 0 ? (
                    <>
                      <p className="text-4xl font-bold text-green-700">
                        {formatCurrency(tcmp2Value)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Valor hora que transforma 100% das despesas em lucro
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Valor do DRE atual ou média das OSs
                      </p>
                    </>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-gray-500">-</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Nenhum diagnóstico de OS realizado ainda
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("DRETCMP2"))}
                  className="bg-white hover:bg-green-50"
                >
                  {tcmp2Value > 0 ? "Atualizar DRE" : "Cadastrar DRE"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dados" className="space-y-6" onValueChange={(value) => {
          // Preservar a aba ativa ao salvar
          console.log("Aba ativa:", value);
        }}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-10 bg-white shadow-md gap-1 p-2">
            <TabsTrigger value="dados" className="text-xs md:text-sm">
              <Building2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="servicos" className="text-xs md:text-sm">
              <Settings className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Serviços</span>
            </TabsTrigger>
            <TabsTrigger value="equipamentos" className="text-xs md:text-sm">
              <Package className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Equipamentos</span>
            </TabsTrigger>
            <TabsTrigger value="terceiros" className="text-xs md:text-sm">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Terceiros</span>
            </TabsTrigger>
            <TabsTrigger value="metas" className="text-xs md:text-sm">
              <Target className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="cultura" className="text-xs md:text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Cultura</span>
            </TabsTrigger>
            <TabsTrigger value="processos" className="text-xs md:text-sm">
              <FileText className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Processos</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs md:text-sm">
              <BarChart3 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="aceleracao" className="text-xs md:text-sm bg-purple-50 text-purple-700 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900">
              <Briefcase className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Aceleração</span>
            </TabsTrigger>
            <TabsTrigger value="crescimento" className="text-xs md:text-sm bg-green-50 text-green-700 data-[state=active]:bg-green-100 data-[state=active]:text-green-900">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Crescimento</span>
            </TabsTrigger>
            <TabsTrigger value="conquistas" className="text-xs md:text-sm bg-yellow-50 text-yellow-700 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Conquistas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crescimento">
            <GrowthDashboard workshop={workshop} />
          </TabsContent>

          <TabsContent value="conquistas">
            <WorkshopMilestones workshop={workshop} />
          </TabsContent>

          <TabsContent value="dados">
            <DadosBasicosOficina workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="servicos">
            <ServicosEquipamentos workshop={workshop} onUpdate={handleUpdate} showServicesOnly={true} />
          </TabsContent>

          <TabsContent value="equipamentos">
            <EquipamentosCompletos workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="terceiros">
            <ServicosTerceirizados workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="metas">
            <MetasObjetivosCompleto workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="cultura">
            <CulturaOrganizacional workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="processos">
            <DocumentosProcessos workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="relatorios">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Relatórios e Diagnósticos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => navigate(createPageUrl("Historico"))}
                  variant="outline"
                  className="h-20 text-left justify-start"
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-semibold">Histórico de Diagnósticos</p>
                    <p className="text-xs text-gray-500">Ver todos os diagnósticos realizados</p>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("Dashboard"))}
                  variant="outline"
                  className="h-20 text-left justify-start"
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-semibold">Dashboard Geral</p>
                    <p className="text-xs text-gray-500">Visão geral de indicadores</p>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("RelatoriosAvancados"))}
                  variant="outline"
                  className="h-20 text-left justify-start bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300"
                >
                  <BarChart3 className="w-5 h-5 mr-3 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-900">Relatórios Avançados</p>
                    <p className="text-xs text-purple-600">Análises customizáveis com exportação</p>
                  </div>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="aceleracao">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Briefcase className="w-7 h-7 text-purple-600" />
                Programa de Aceleração
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => navigate(createPageUrl("PainelClienteAceleracao"))}
                  variant="outline"
                  className="h-24 text-left justify-start bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-purple-300"
                >
                  <Target className="w-6 h-6 mr-3 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-900">Meu Plano de Aceleração</p>
                    <p className="text-xs text-gray-600">Progresso, tarefas e cronograma</p>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("CronogramaConsultoria"))}
                  variant="outline"
                  className="h-24 text-left justify-start bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300"
                >
                  <CalendarIcon className="w-6 h-6 mr-3 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Cronograma de Atendimentos</p>
                    <p className="text-xs text-gray-600">Reuniões e atas de consultoria</p>
                  </div>
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl("CronogramaImplementacao"))}
                  variant="outline"
                  className="h-24 text-left justify-start bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                >
                  <Target className="w-6 h-6 mr-3 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Cronograma de Implementação</p>
                    <p className="text-xs text-gray-600">Acompanhe o progresso das ferramentas</p>
                  </div>
                </Button>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
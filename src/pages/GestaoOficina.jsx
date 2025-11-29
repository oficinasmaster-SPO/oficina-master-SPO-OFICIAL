import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Settings, Target, FileText, Users, TrendingUp, Package, DollarSign, BarChart3, Calculator } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "../components/utils/formatters";
import DadosBasicosOficina from "../components/workshop/DadosBasicosOficina";
import ServicosEquipamentos from "../components/workshop/ServicosEquipamentos";
import EquipamentosCompletos from "../components/workshop/EquipamentosCompletos";
import ServicosTerceirizados from "../components/workshop/ServicosTerceirizados";
import MetasObjetivosCompleto from "../components/workshop/MetasObjetivosCompleto";
import CulturaOrganizacional from "../components/workshop/CulturaOrganizacional";
import DocumentosProcessos from "../components/workshop/DocumentosProcessos";

export default function GestaoOficina() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshopKey, setWorkshopKey] = useState(0); // Key para forçar re-render dos componentes

  // Carregar usuário
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Query para buscar oficina
  const { data: workshop, isLoading: loadingWorkshop, refetch: refetchWorkshop } = useQuery({
    queryKey: ['workshop-gestao', user?.id],
    queryFn: async () => {
      const workshops = await base44.entities.Workshop.list();
      const workshopsArray = Array.isArray(workshops) ? workshops : [];
      
      // Prioriza oficina do próprio usuário
      let workshopToDisplay = workshopsArray.find(w => w.owner_id === user.id);
      
      // Se não encontrou oficina própria, pega a primeira disponível
      if (!workshopToDisplay && workshopsArray.length > 0) {
        workshopToDisplay = workshopsArray[0];
      }

      return workshopToDisplay || null;
    },
    enabled: !!user?.id,
    staleTime: 0, // Sempre buscar dados frescos
    cacheTime: 0, // Não manter cache
  });

  // Query para TCMP2
  const { data: tcmp2Value = 0, isLoading: loadingTcmp2 } = useQuery({
    queryKey: ['tcmp2-gestao', workshop?.id],
    queryFn: async () => {
      const osAssessments = await base44.entities.ServiceOrderDiagnostic.filter(
        { workshop_id: workshop.id },
        '-created_date',
        10
      );
      
      const assessmentsArray = Array.isArray(osAssessments) ? osAssessments : [];
      if (assessmentsArray.length > 0) {
        const validAssessments = assessmentsArray.filter(os => os?.ideal_hour_value > 0);
        if (validAssessments.length > 0) {
          return validAssessments.reduce((sum, os) => sum + os.ideal_hour_value, 0) / validAssessments.length;
        }
      }
      return 0;
    },
    enabled: !!workshop?.id,
  });

  // Mutation para atualizar oficina
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Workshop.update(workshop.id, data);
    },
    onSuccess: async (updatedWorkshop) => {
      // Invalida o cache e força re-fetch
      await queryClient.invalidateQueries({ queryKey: ['workshop-gestao'] });
      await queryClient.invalidateQueries({ queryKey: ['workshop'] });
      await queryClient.invalidateQueries({ queryKey: ['shared-workshop'] });
      
      // Força refetch imediato
      await refetchWorkshop();
      
      // Incrementa a key para forçar re-render dos componentes filhos
      setWorkshopKey(prev => prev + 1);
      
      toast.success("Oficina atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating workshop:", error);
      toast.error("Erro ao atualizar oficina");
    }
  });

  const handleUpdate = useCallback(async (data) => {
    await updateMutation.mutateAsync(data);
  }, [updateMutation]);

  const loading = !user || loadingWorkshop;

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
                  Nível {workshop.maturity_level || 1}
                </span>
                {workshop.is_autocenter && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    Auto Center
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Engajamento</p>
              <p className="text-2xl font-bold text-blue-600">{workshop.engagement_score || 0}%</p>
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
                        Média das últimas 10 OSs diagnosticadas
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
                  onClick={() => navigate(createPageUrl("DiagnosticoOS"))}
                  className="bg-white hover:bg-green-50"
                >
                  Fazer Diagnóstico
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 bg-white shadow-md gap-1 p-2">
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
          </TabsList>

          <TabsContent value="dados">
            <DadosBasicosOficina key={`dados-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="servicos">
            <ServicosEquipamentos key={`servicos-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} showServicesOnly={true} />
          </TabsContent>

          <TabsContent value="equipamentos">
            <EquipamentosCompletos key={`equipamentos-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="terceiros">
            <ServicosTerceirizados key={`terceiros-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="metas">
            <MetasObjetivosCompleto key={`metas-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="cultura">
            <CulturaOrganizacional key={`cultura-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="processos">
            <DocumentosProcessos key={`processos-${workshopKey}`} workshop={workshop} onUpdate={handleUpdate} />
          </TabsContent>

          <TabsContent value="relatorios">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Relatórios e Diagnósticos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
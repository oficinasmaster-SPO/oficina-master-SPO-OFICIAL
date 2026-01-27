import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Users, DollarSign, Target, ArrowLeft, Calendar, Sparkles, Filter } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PainelMetas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workshop, setWorkshop] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [filterSourceType, setFilterSourceType] = useState("all");
  const [breakdown, setBreakdown] = useState(null);
  const [managementDiagnostic, setManagementDiagnostic] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      
      let userWorkshop = null;
      
      if (adminWorkshopId && user.role === 'admin') {
        userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
      } else {
        const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
        userWorkshop = workshops[0];
      }
      
      if (!userWorkshop) {
        toast.error("Oficina não encontrada");
        navigate(createPageUrl("Home"));
        return;
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Buscar metas do mês selecionado
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', workshop?.id, selectedMonth, filterSourceType],
    queryFn: async () => {
      const allGoals = await base44.entities.Goal.filter({ workshop_id: workshop.id });
      
      // Filtrar por interseção de datas
      const [year, month] = selectedMonth.split('-');
      const filterStart = `${year}-${month}-01`;
      const filterEnd = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      
      let filtered = allGoals.filter(goal => {
        return goal.data_inicio <= filterEnd && goal.data_fim >= filterStart;
      });
      
      // Filtrar por tipo de origem
      if (filterSourceType !== "all") {
        filtered = filtered.filter(g => g.source_type === filterSourceType);
      }
      
      return filtered;
    },
    enabled: !!workshop
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ workshop_id: workshop.id, status: 'ativo' });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop
  });

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : 'Desconhecido';
  };

  const statusColors = {
    ativa: "bg-blue-100 text-blue-800",
    concluida: "bg-green-100 text-green-800",
    cancelada: "bg-gray-100 text-gray-800"
  };

  if (loading || goalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop) return null;

  // Calcular totais e agregações das metas
  const totalMetas = goals.reduce((sum, g) => {
    const faturamentoPecas = g.metricas?.faturamento_pecas?.meta || 0;
    const faturamentoServicos = g.metricas?.faturamento_servicos?.meta || 0;
    return sum + faturamentoPecas + faturamentoServicos;
  }, 0);

  const totalRealizado = goals.reduce((sum, g) => {
    const faturamentoPecas = g.metricas?.faturamento_pecas?.realizado || 0;
    const faturamentoServicos = g.metricas?.faturamento_servicos?.realizado || 0;
    return sum + faturamentoPecas + faturamentoServicos;
  }, 0);

  const totalClientes = goals.reduce((sum, g) => g.metricas?.volume_clientes?.meta || 0, 0);
  const totalClientesRealizado = goals.reduce((sum, g) => g.metricas?.volume_clientes?.realizado || 0, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Painel de Metas</h1>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {selectedMonth ? new Date(selectedMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : "Todas as metas"}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl("GestaoOficina"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Label className="text-sm font-semibold">Período:</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Origem:</Label>
                <Select value={filterSourceType} onValueChange={setFilterSourceType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="manual">Manuais</SelectItem>
                    <SelectItem value="desdobramento">Desdobramento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Consolidados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Meta Total</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMetas)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Realizado</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRealizado)}
              </p>
              {totalMetas > 0 && (
                <Badge className="mt-1 bg-green-100 text-green-800">
                  {((totalRealizado / totalMetas) * 100).toFixed(1)}%
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Clientes (Meta)</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {totalClientes}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Clientes (Real)</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {totalClientesRealizado}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Metas */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nenhuma meta encontrada para este período</p>
              </CardContent>
            </Card>
          ) : (
            goals.map(goal => (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">
                          Meta {goal.periodo.charAt(0).toUpperCase() + goal.periodo.slice(1)}
                          {goal.source_type === "desdobramento" && (
                            <Badge variant="outline" className="ml-2 text-xs">Desdobramento</Badge>
                          )}
                        </CardTitle>
                        <Badge className={statusColors[goal.status]}>
                          {goal.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        {new Date(goal.data_inicio).toLocaleDateString('pt-BR')} até {new Date(goal.data_fim).toLocaleDateString('pt-BR')}
                      </div>

                      {goal.meta_areas && goal.meta_areas.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Áreas impactadas:</p>
                          <div className="flex flex-wrap gap-1">
                            {goal.meta_areas.map(area => (
                              <Badge key={area} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {goal.responsible_employee_ids && goal.responsible_employee_ids.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Responsáveis:</p>
                          <div className="flex flex-wrap gap-1">
                            {goal.responsible_employee_ids.map(id => (
                              <Badge key={id} className="bg-blue-100 text-blue-800 text-xs">
                                {getEmployeeName(id)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {goal.metricas?.volume_clientes?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Clientes</p>
                        <p className="text-lg font-bold">{goal.metricas.volume_clientes.meta}</p>
                        <p className="text-xs text-green-600">
                          Realizado: {goal.metricas.volume_clientes.realizado || 0}
                        </p>
                      </div>
                    )}
                    {goal.metricas?.faturamento_pecas?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Peças</p>
                        <p className="text-lg font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.metricas.faturamento_pecas.meta)}</p>
                        <p className="text-xs text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.metricas.faturamento_pecas.realizado || 0)}
                        </p>
                      </div>
                    )}
                    {goal.metricas?.faturamento_servicos?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Serviços</p>
                        <p className="text-lg font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.metricas.faturamento_servicos.meta)}</p>
                        <p className="text-xs text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.metricas.faturamento_servicos.realizado || 0)}
                        </p>
                      </div>
                    )}
                    {goal.metricas?.rentabilidade?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Rentabilidade</p>
                        <p className="text-lg font-bold">{goal.metricas.rentabilidade.meta}%</p>
                        <p className="text-xs text-green-600">
                          {goal.metricas.rentabilidade.realizado || 0}%
                        </p>
                      </div>
                    )}
                  </div>

                  {goal.observacoes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                      {goal.observacoes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
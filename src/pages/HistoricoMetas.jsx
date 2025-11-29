import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Loader2, Calendar, TrendingUp, Target, BarChart3, Plus, 
  CheckCircle, XCircle, DollarSign, Users, ArrowLeft 
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area 
} from "recharts";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import { toast } from "sonner";

export default function HistoricoMetas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    month: "",
    target_revenue_parts: 0,
    target_revenue_services: 0,
    target_profit_percentage: 0,
    target_average_ticket: 0,
    target_customer_volume: 0,
    actual_revenue_parts: 0,
    actual_revenue_services: 0,
    actual_profit_percentage: 0,
    actual_average_ticket: 0,
    actual_customer_volume: 0,
    actual_costs: 0,
    achieved: false,
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const workshopsArray = Array.isArray(workshops) ? workshops : [];
      const userWorkshop = workshopsArray.find(w => w.owner_id === currentUser.id);

      if (!userWorkshop) {
        navigate(createPageUrl("Cadastro"));
        return;
      }

      setWorkshop(userWorkshop);
    } catch (error) {
      console.log("Error loading data:", error);
      navigate(createPageUrl("Home"));
    }
  };

  const { data: goalsHistory = [], isLoading } = useQuery({
    queryKey: ['goals-history', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      try {
        const result = await base44.entities.MonthlyGoalHistory.filter(
          { workshop_id: workshop.id },
          '-month',
          50
        );
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching goals history:", error);
        return [];
      }
    },
    enabled: !!workshop?.id,
    retry: 1
  });

  const addGoalMutation = useMutation({
    mutationFn: async (goalData) => {
      return await base44.entities.MonthlyGoalHistory.create({
        ...goalData,
        workshop_id: workshop.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals-history']);
      setShowAddDialog(false);
      setNewGoal({
        month: "",
        target_revenue_parts: 0,
        target_revenue_services: 0,
        target_profit_percentage: 0,
        target_average_ticket: 0,
        target_customer_volume: 0,
        actual_revenue_parts: 0,
        actual_revenue_services: 0,
        actual_profit_percentage: 0,
        actual_average_ticket: 0,
        actual_customer_volume: 0,
        actual_costs: 0,
        achieved: false,
        notes: ""
      });
      toast.success("Meta registrada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao registrar meta");
    }
  });

  const handleSaveGoal = () => {
    if (!newGoal.month) {
      toast.error("Selecione o mês");
      return;
    }

    const targetTotal = (newGoal.target_revenue_parts || 0) + (newGoal.target_revenue_services || 0);
    const actualTotal = (newGoal.actual_revenue_parts || 0) + (newGoal.actual_revenue_services || 0);
    const achieved = actualTotal >= targetTotal;

    addGoalMutation.mutate({ ...newGoal, achieved });
  };

  // Prepare chart data
  const chartData = goalsHistory
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(goal => {
      const targetTotal = (goal.target_revenue_parts || 0) + (goal.target_revenue_services || 0);
      const actualTotal = (goal.actual_revenue_parts || 0) + (goal.actual_revenue_services || 0);
      const lucro = actualTotal - (goal.actual_costs || 0);

      return {
        month: goal.month,
        monthLabel: new Date(goal.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        meta: targetTotal,
        realizado: actualTotal,
        custos: goal.actual_costs || 0,
        lucro: lucro,
        ticketMedio: goal.actual_average_ticket || 0,
        ticketPecas: goal.actual_revenue_parts && goal.actual_customer_volume 
          ? goal.actual_revenue_parts / goal.actual_customer_volume : 0,
        ticketServicos: goal.actual_revenue_services && goal.actual_customer_volume 
          ? goal.actual_revenue_services / goal.actual_customer_volume : 0,
        clientes: goal.actual_customer_volume || 0
      };
    });

  if (!workshop || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(createPageUrl("GestaoOficina"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Metas</h1>
              <p className="text-gray-600">{workshop.name}</p>
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Mês
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Metas e Resultados do Mês</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div>
                  <Label>Mês de Referência</Label>
                  <Input
                    type="month"
                    value={newGoal.month}
                    onChange={(e) => setNewGoal({ ...newGoal, month: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Metas</h4>
                    <div>
                      <Label className="text-xs">Fat. Peças (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.target_revenue_parts}
                        onChange={(e) => setNewGoal({ ...newGoal, target_revenue_parts: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fat. Serviços (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.target_revenue_services}
                        onChange={(e) => setNewGoal({ ...newGoal, target_revenue_services: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Lucro (%)</Label>
                      <Input
                        type="number"
                        value={newGoal.target_profit_percentage}
                        onChange={(e) => setNewGoal({ ...newGoal, target_profit_percentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ticket Médio (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.target_average_ticket}
                        onChange={(e) => setNewGoal({ ...newGoal, target_average_ticket: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Clientes</Label>
                      <Input
                        type="number"
                        value={newGoal.target_customer_volume}
                        onChange={(e) => setNewGoal({ ...newGoal, target_customer_volume: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Realizado</h4>
                    <div>
                      <Label className="text-xs">Fat. Peças (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.actual_revenue_parts}
                        onChange={(e) => setNewGoal({ ...newGoal, actual_revenue_parts: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fat. Serviços (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.actual_revenue_services}
                        onChange={(e) => setNewGoal({ ...newGoal, actual_revenue_services: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Lucro (%)</Label>
                      <Input
                        type="number"
                        value={newGoal.actual_profit_percentage}
                        onChange={(e) => setNewGoal({ ...newGoal, actual_profit_percentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ticket Médio (R$)</Label>
                      <Input
                        type="number"
                        value={newGoal.actual_average_ticket}
                        onChange={(e) => setNewGoal({ ...newGoal, actual_average_ticket: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Clientes</Label>
                      <Input
                        type="number"
                        value={newGoal.actual_customer_volume}
                        onChange={(e) => setNewGoal({ ...newGoal, actual_customer_volume: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Custos Totais (R$)</Label>
                  <Input
                    type="number"
                    value={newGoal.actual_costs}
                    onChange={(e) => setNewGoal({ ...newGoal, actual_costs: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newGoal.notes}
                    onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                    placeholder="Observações do mês..."
                  />
                </div>

                <Button 
                  onClick={handleSaveGoal} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={addGoalMutation.isPending}
                >
                  {addGoalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Salvar Registro
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Meses Registrados</p>
                  <p className="text-2xl font-bold text-blue-900">{goalsHistory.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Metas Atingidas</p>
                  <p className="text-2xl font-bold text-green-900">
                    {goalsHistory.filter(g => g.achieved).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Metas Não Atingidas</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {goalsHistory.filter(g => !g.achieved).length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {goalsHistory.length > 0 
                      ? Math.round((goalsHistory.filter(g => g.achieved).length / goalsHistory.length) * 100)
                      : 0}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {goalsHistory.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-600 mb-4">
                Comece a registrar os resultados mensais para acompanhar a evolução da oficina.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Primeiro Mês
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="charts" className="space-y-6">
            <TabsList className="bg-white shadow-md">
              <TabsTrigger value="charts">📊 Gráficos</TabsTrigger>
              <TabsTrigger value="list">📋 Lista Detalhada</TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-6">
              {/* Faturamento vs Custos = Lucro */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Faturamento vs Custos = Lucro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="realizado" fill="#3b82f6" name="Faturamento" />
                      <Bar dataKey="custos" fill="#ef4444" name="Custos" />
                      <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={3} name="Lucro" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Meta vs Realizado */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Meta vs Realizado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="meta" fill="#94a3b8" name="Meta" />
                      <Bar dataKey="realizado" fill="#3b82f6" name="Realizado" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Ticket Médio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Ticket Médio (Geral, Peças e Serviços)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ticketMedio" stroke="#8b5cf6" strokeWidth={2} name="Ticket Médio Geral" />
                      <Line type="monotone" dataKey="ticketPecas" stroke="#f59e0b" strokeWidth={2} name="Ticket Peças" />
                      <Line type="monotone" dataKey="ticketServicos" stroke="#06b6d4" strokeWidth={2} name="Ticket Serviços" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Volume de Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    Volume de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clientes" fill="#f97316" name="Clientes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              {goalsHistory.map((goal) => {
                const targetTotal = (goal.target_revenue_parts || 0) + (goal.target_revenue_services || 0);
                const actualTotal = (goal.actual_revenue_parts || 0) + (goal.actual_revenue_services || 0);
                const percentAchieved = targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0;

                return (
                  <Card key={goal.id} className={goal.achieved ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {new Date(goal.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </h3>
                            {goal.notes && <p className="text-sm text-gray-600">{goal.notes}</p>}
                          </div>
                        </div>
                        <Badge className={goal.achieved ? 'bg-green-600' : 'bg-orange-600'}>
                          {goal.achieved ? 'Meta Atingida' : 'Meta Não Atingida'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Meta</p>
                          <p className="font-bold">{formatCurrency(targetTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Realizado</p>
                          <p className="font-bold">{formatCurrency(actualTotal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">% Atingido</p>
                          <p className={`font-bold ${percentAchieved >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatNumber(percentAchieved, 1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Lucro %</p>
                          <p className="font-bold">{formatNumber(goal.actual_profit_percentage || 0, 1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Clientes</p>
                          <p className="font-bold">{goal.actual_customer_volume || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
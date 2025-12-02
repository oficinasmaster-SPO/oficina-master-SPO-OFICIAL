import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowRight, Sparkles, Upload, Filter, Download, Eye } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";
import { toast } from "sonner";
import GoalDetailsModal from "@/components/goals/GoalDetailsModal";

export default function HistoricoMetas() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState("workshop"); // 'workshop' or 'employee'
  const [filterEntityId, setFilterEntityId] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    month_year: new Date().toISOString().slice(0, 7),
    goal_established: "",
    result_achieved: "",
    detailed_data_json: "{}", // Simplified for manual input, ideally file upload
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadData = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const workshops = await base44.entities.Workshop.filter({ owner_id: u.id });
      setWorkshop(workshops[0]);
      if (workshops[0]) {
        setFilterEntityId(workshops[0].id); // Default to workshop
      }
    };
    loadData();
  }, []);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['goal-history', filterType, filterEntityId],
    queryFn: async () => {
      if (!user) return [];
      
      // Logic to fetch based on filters
      let query = {};
      if (filterType === 'workshop' && workshop) {
        query = { entity_id: workshop.id, entity_type: 'workshop' };
      } else if (filterType === 'employee' && filterEntityId !== 'all') {
        query = { entity_id: filterEntityId, entity_type: 'employee' };
      } else {
        // Fallback or admin view all
        query = {}; 
      }

      const results = await base44.entities.GoalHistory.filter(query, '-month_year', 50);
      return results;
    },
    enabled: !!user && !!workshop
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate status
      const percentage = (data.result_achieved / data.goal_established) * 100;
      let status = "red";
      if (percentage >= 100) status = "green";
      else if (percentage >= 85) status = "yellow";

      // Generate AI insights
      let aiInsights = null;
      try {
        setIsGeneratingAI(true);
        const aiRes = await base44.functions.invoke('generateGoalInsights', {
            goalData: { ...data, percentage_achieved: percentage, status },
            historyData: history.slice(0, 3) // Last 3 months context
        });
        aiInsights = aiRes.data;
      } catch (e) {
        console.error("AI Gen error", e);
        toast.error("Não foi possível gerar insights de IA, salvando sem eles.");
      } finally {
        setIsGeneratingAI(false);
      }

      return await base44.entities.GoalHistory.create({
        ...data,
        percentage_achieved: percentage,
        status,
        ai_insights: aiInsights,
        detailed_data: JSON.parse(formData.detailed_data_json || "{}")
      });
    },
    onSuccess: () => {
      toast.success("Histórico registrado com sucesso!");
      setIsAddOpen(false);
      setFormData({
        month_year: new Date().toISOString().slice(0, 7),
        goal_established: "",
        result_achieved: "",
        detailed_data_json: "{}"
      });
      queryClient.invalidateQueries(['goal-history']);
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.goal_established || !formData.result_achieved) {
        toast.error("Preencha os valores");
        return;
    }

    createMutation.mutate({
        entity_id: filterType === 'workshop' ? workshop.id : filterEntityId, // Use current filter context for creation
        entity_type: filterType,
        month_year: formData.month_year,
        goal_established: parseFloat(formData.goal_established),
        result_achieved: parseFloat(formData.result_achieved)
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
        case 'green': return "bg-green-500";
        case 'yellow': return "bg-yellow-400";
        case 'red': return "bg-red-500";
        default: return "bg-gray-300";
    }
  };

  const getStatusText = (status) => {
    switch(status) {
        case 'green': return "Meta Superada";
        case 'yellow': return "Parcialmente Atingida";
        case 'red': return "Não Atingida";
        default: return "-";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Metas</h1>
          <p className="text-gray-500">Acompanhe a evolução e resultados mensais.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>
                <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Novo Registro Manual
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Resultado Mensal</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
                        <div>
                            <Label>Entidade</Label>
                            <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
                                {filterType === 'workshop' ? 'Oficina (Geral)' : 'Colaborador Selecionado'}
                            </div>
                        </div>
                        <div>
                            <Label>Mês/Ano</Label>
                            <Input type="month" value={formData.month_year} onChange={e => setFormData({...formData, month_year: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Meta (R$)</Label>
                                <Input type="number" value={formData.goal_established} onChange={e => setFormData({...formData, goal_established: e.target.value})} />
                            </div>
                            <div>
                                <Label>Realizado (R$)</Label>
                                <Input type="number" value={formData.result_achieved} onChange={e => setFormData({...formData, result_achieved: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <Label>Dados Adicionais (JSON - Opcional)</Label>
                            <Input value={formData.detailed_data_json} onChange={e => setFormData({...formData, detailed_data_json: e.target.value})} placeholder='{"ranking": [...] }' />
                            <p className="text-xs text-gray-400 mt-1">Para integração automática, use a API.</p>
                        </div>
                        <Button type="submit" className="w-full" disabled={createMutation.isPending || isGeneratingAI}>
                            {(createMutation.isPending || isGeneratingAI) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            {isGeneratingAI ? "Gerando Insights IA..." : "Salvar e Analisar"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filtrar por:</span>
            </div>
            <Select value={filterType} onValueChange={val => { setFilterType(val); if(val === 'workshop' && workshop) setFilterEntityId(workshop.id); }}>
                <SelectTrigger className="w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="workshop">Oficina (Geral)</SelectItem>
                    <SelectItem value="employee">Colaborador</SelectItem>
                </SelectContent>
            </Select>
            
            {filterType === 'employee' && (
                <Select value={filterEntityId} onValueChange={setFilterEntityId}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>
        ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                Nenhum histórico encontrado para este filtro.
            </div>
        ) : (
            history.map(goal => (
                <Card key={goal.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <div className={`h-1 w-full ${getStatusColor(goal.status)}`} />
                    <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 font-bold text-gray-600 border-2 ${goal.status === 'green' ? 'border-green-500' : goal.status === 'yellow' ? 'border-yellow-500' : 'border-red-500'}`}>
                                {goal.month_year.split('-')[1]}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{goal.month_year}</h3>
                                <p className="text-xs text-gray-500 capitalize">{getStatusText(goal.status)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 flex-1 text-center md:text-left border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Meta</p>
                                <p className="font-semibold">{formatCurrency(goal.goal_established)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Realizado</p>
                                <p className="font-semibold">{formatCurrency(goal.result_achieved)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Atingimento</p>
                                <Badge variant="outline" className={`${goal.status === 'green' ? 'bg-green-50 text-green-700 border-green-200' : goal.status === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {goal.percentage_achieved.toFixed(1)}%
                                </Badge>
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full md:w-auto"
                            onClick={() => { setSelectedGoal(goal); setIsDetailsOpen(true); }}
                        >
                            <span className="hidden md:inline">Ver Detalhes</span> <ArrowRight className="w-4 h-4 md:ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            ))
        )}
      </div>

      <GoalDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        goal={selectedGoal} 
        history={history} // Pass full history for trends
      />
    </div>
  );
}
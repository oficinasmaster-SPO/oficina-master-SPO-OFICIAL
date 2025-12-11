import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, TrendingUp, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function KPIManager({ employeeId, workshopId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    kpi_name: "",
    description: "",
    target_value: 0,
    unit: "%",
    period: "mensal",
    category: "producao"
  });

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['employee-kpis', employeeId],
    queryFn: () => base44.entities.EmployeeKPI.filter({ employee_id: employeeId }),
    enabled: !!employeeId
  });

  const createKPI = useMutation({
    mutationFn: (data) => base44.entities.EmployeeKPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-kpis']);
      toast.success("KPI criado com sucesso!");
      setShowDialog(false);
      setFormData({
        kpi_name: "",
        description: "",
        target_value: 0,
        unit: "%",
        period: "mensal",
        category: "producao"
      });
    }
  });

  const updateKPI = useMutation({
    mutationFn: ({ id, current_value }) => base44.entities.EmployeeKPI.update(id, { current_value }),
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-kpis']);
      toast.success("KPI atualizado!");
    }
  });

  const analyzePerformance = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeEmployeePerformance', {
        employee_id: employeeId
      });

      if (response.data.success) {
        setAnalysis(response.data.ai_analysis);
        toast.success("Análise gerada com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao analisar desempenho");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createKPI.mutate({
      employee_id: employeeId,
      workshop_id: workshopId,
      ...formData,
      target_value: parseFloat(formData.target_value)
    });
  };

  const calculateAchievement = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  if (isLoading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">KPIs de Desempenho</h3>
        <div className="flex gap-2">
          <Button onClick={analyzePerformance} disabled={analyzing || kpis.length === 0} variant="outline">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Analisar com IA
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Adicionar KPI</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo KPI</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome do KPI</Label>
                  <Input
                    value={formData.kpi_name}
                    onChange={(e) => setFormData({ ...formData, kpi_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Período</Label>
                    <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="atendimento">Atendimento</SelectItem>
                        <SelectItem value="eficiencia">Eficiência</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={createKPI.isPending}>
                  {createKPI.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Criar KPI
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {analysis && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Análise de Desempenho por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-purple-900">Score de Desempenho</p>
              <p className="text-3xl font-bold text-purple-600">{analysis.performance_score}/10</p>
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900 mb-1">Avaliação Geral</p>
              <p className="text-sm text-gray-700">{analysis.overall_assessment}</p>
            </div>
            {analysis.strengths?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-900 mb-1">Pontos Fortes</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {analysis.improvement_areas?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-900 mb-1">Áreas de Melhoria</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {analysis.improvement_areas.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {analysis.recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Recomendações</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {kpis.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum KPI definido ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {kpis.map((kpi) => {
            const achievement = calculateAchievement(kpi.current_value, kpi.target_value);
            return (
              <Card key={kpi.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{kpi.kpi_name}</h4>
                      <p className="text-sm text-gray-600">{kpi.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Período: {kpi.period} • Categoria: {kpi.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{kpi.current_value}{kpi.unit}</p>
                      <p className="text-sm text-gray-600">Meta: {kpi.target_value}{kpi.unit}</p>
                    </div>
                  </div>
                  <Progress value={achievement} className="h-2 mb-2" />
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{achievement.toFixed(1)}% atingido</p>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Atualizar valor"
                      className="w-32 h-8"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          updateKPI.mutate({ id: kpi.id, current_value: val });
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
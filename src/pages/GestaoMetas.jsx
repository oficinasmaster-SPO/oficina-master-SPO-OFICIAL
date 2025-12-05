import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Plus, TrendingUp, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import AdvancedFilter from "@/components/shared/AdvancedFilter";

export default function GestaoMetas() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filters, setFilters] = useState({ search: "", area: "all", periodo: "all" });
  const [formData, setFormData] = useState({
    periodo: "mensal",
    area: "geral",
    data_inicio: "",
    data_fim: "",
    responsavel_id: "",
    observacoes: "",
    metricas: {
      volume_clientes: { meta: 0, realizado: 0 },
      faturamento_pecas: { meta: 0, realizado: 0 },
      faturamento_servicos: { meta: 0, realizado: 0 },
      rentabilidade: { meta: 0, realizado: 0 },
      lucro: { meta: 0, realizado: 0 },
      ticket_medio_pecas: { meta: 0, realizado: 0 },
      ticket_medio_servicos: { meta: 0, realizado: 0 }
    }
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops', user?.id],
    queryFn: () => base44.entities.Workshop.filter({ owner_id: user.id }),
    enabled: !!user
  });

  const workshop = workshops[0];

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', workshop?.id],
    queryFn: () => base44.entities.Goal.filter({ workshop_id: workshop.id }),
    enabled: !!workshop
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return base44.entities.Goal.update(editingGoal.id, data);
      }
      return base44.entities.Goal.create({ ...data, workshop_id: workshop.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingGoal ? "Meta atualizada!" : "Meta criada!");
    }
  });

  const resetForm = () => {
    setEditingGoal(null);
    setFormData({
      periodo: "mensal",
      area: "geral",
      data_inicio: "",
      data_fim: "",
      responsavel_id: "",
      observacoes: "",
      metricas: {
        volume_clientes: { meta: 0, realizado: 0 },
        faturamento_pecas: { meta: 0, realizado: 0 },
        faturamento_servicos: { meta: 0, realizado: 0 },
        rentabilidade: { meta: 0, realizado: 0 },
        lucro: { meta: 0, realizado: 0 },
        ticket_medio_pecas: { meta: 0, realizado: 0 },
        ticket_medio_servicos: { meta: 0, realizado: 0 }
      }
    });
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData(goal);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.data_inicio || !formData.data_fim) {
      toast.error("Preencha as datas");
      return;
    }
    saveMutation.mutate(formData);
  };

  const updateMetrica = (metrica, field, value) => {
    setFormData({
      ...formData,
      metricas: {
        ...formData.metricas,
        [metrica]: {
          ...formData.metricas[metrica],
          [field]: parseFloat(value) || 0
        }
      }
    });
  };

  const getStatusColor = (goal) => {
    const percent = goal.percentual_atingido || 0;
    if (percent >= 100) return "bg-green-100 text-green-700";
    if (percent >= 80) return "bg-blue-100 text-blue-700";
    if (percent >= 50) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestão de Metas</h1>
            <p className="text-gray-600">Defina e acompanhe metas por área e funcionário</p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Nova Meta
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Stats cards remain unchanged */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="w-10 h-10 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{goals.filter(g => g.status === 'ativa').length}</div>
                  <div className="text-sm text-gray-600">Metas Ativas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{goals.filter(g => (g.percentual_atingido || 0) >= 100).length}</div>
                  <div className="text-sm text-gray-600">Metas Atingidas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-10 h-10 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{goals.filter(g => g.responsavel_id).length}</div>
                  <div className="text-sm text-gray-600">Metas Individuais</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AdvancedFilter 
          onFilter={setFilters}
          filterConfig={[
            {
              key: "area",
              label: "Área",
              type: "select",
              defaultValue: "all",
              options: [
                { value: "all", label: "Todas Áreas" },
                { value: "vendas", label: "Vendas" },
                { value: "comercial", label: "Comercial" },
                { value: "tecnico", label: "Técnico" },
                { value: "financeiro", label: "Financeiro" }
              ]
            },
            {
              key: "periodo",
              label: "Período",
              type: "select",
              defaultValue: "all",
              options: [
                { value: "all", label: "Todos" },
                { value: "mensal", label: "Mensal" },
                { value: "semanal", label: "Semanal" }
              ]
            }
          ]}
          placeholder="Buscar metas..."
        />

        <div className="grid grid-cols-1 gap-4">
          {goals.filter(g => {
            const matchesSearch = filters.search ? JSON.stringify(g).toLowerCase().includes(filters.search.toLowerCase()) : true;
            const matchesArea = filters.area === 'all' || g.area === filters.area;
            const matchesPeriodo = filters.periodo === 'all' || g.periodo === filters.periodo;
            return matchesSearch && matchesArea && matchesPeriodo;
          }).map((goal) => (
            <Card key={goal.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getStatusColor(goal)}>
                        {goal.percentual_atingido || 0}% atingido
                      </Badge>
                      <Badge variant="outline">{goal.periodo}</Badge>
                      <Badge variant="outline">{goal.area}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      {Object.entries(goal.metricas || {}).map(([key, value]) => (
                        value.meta > 0 && (
                          <div key={key}>
                            <div className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                            <div className="font-bold">{value.realizado} / {value.meta}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {goals.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Nenhuma meta cadastrada. Crie sua primeira meta!</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Editar Meta" : "Nova Meta"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Período</Label>
                  <Select value={formData.periodo} onValueChange={(v) => setFormData({...formData, periodo: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={formData.area} onValueChange={(v) => setFormData({...formData, area: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="pateo">Pátio</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="lideranca">Liderança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={formData.data_fim} onChange={(e) => setFormData({...formData, data_fim: e.target.value})} />
                </div>
              </div>

              <div>
                <Label>Responsável (Opcional)</Label>
                <Select value={formData.responsavel_id} onValueChange={(v) => setFormData({...formData, responsavel_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum (Meta de área)</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">Métricas</Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.metricas).map((key) => (
                    <div key={key} className="border p-3 rounded-lg">
                      <Label className="capitalize text-sm">{key.replace(/_/g, ' ')}</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Input
                          type="number"
                          placeholder="Meta"
                          value={formData.metricas[key].meta}
                          onChange={(e) => updateMetrica(key, 'meta', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Realizado"
                          value={formData.metricas[key].realizado}
                          onChange={(e) => updateMetrica(key, 'realizado', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} rows={3} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Target, Edit, Trash2, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import GoalFormDialog from "@/components/goals/GoalFormDialog";
import { formatCurrency } from "@/components/utils/formatters";

export default function GestaoMetas() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');

      let userWorkshop = null;
      
      if (adminWorkshopId && currentUser.role === 'admin') {
        userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
      } else {
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        userWorkshop = workshops[0];
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    }
  };

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', workshop?.id],
    queryFn: async () => {
      const result = await base44.entities.Goal.filter({ workshop_id: workshop.id });
      return Array.isArray(result) ? result : [];
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

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({ ...data, workshop_id: workshop.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success("Meta criada com sucesso!");
      setShowForm(false);
      setEditingGoal(null);
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success("Meta atualizada!");
      setShowForm(false);
      setEditingGoal(null);
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success("Meta excluída!");
    }
  });

  const handleSaveGoal = async (data) => {
    if (editingGoal) {
      await updateGoalMutation.mutateAsync({ id: editingGoal.id, data });
    } else {
      await createGoalMutation.mutateAsync(data);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
      deleteGoalMutation.mutate(id);
    }
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : 'Desconhecido';
  };

  const statusColors = {
    ativa: "bg-blue-100 text-blue-800",
    concluida: "bg-green-100 text-green-800",
    cancelada: "bg-gray-100 text-gray-800"
  };

  if (isLoading || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              Gestão de Metas
            </h1>
            <p className="text-gray-600 mt-1">
              Configure metas, responsáveis e áreas impactadas
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingGoal(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>

        <div className="grid gap-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-4">Nenhuma meta cadastrada</p>
                <Button onClick={() => setShowForm(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira meta
                </Button>
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
                        </CardTitle>
                        <Badge className={statusColors[goal.status]}>
                          {goal.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <Calendar className="w-4 h-4" />
                        {new Date(goal.data_inicio).toLocaleDateString('pt-BR')} até {new Date(goal.data_fim).toLocaleDateString('pt-BR')}
                      </div>

                      {/* Áreas Impactadas */}
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

                      {/* Responsáveis */}
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

                      {/* Envolvidos */}
                      {goal.involved_employee_ids && goal.involved_employee_ids.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Envolvidos:</p>
                          <div className="flex flex-wrap gap-1">
                            {goal.involved_employee_ids.map(id => (
                              <Badge key={id} className="bg-purple-100 text-purple-800 text-xs">
                                {getEmployeeName(id)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(goal)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Métricas Principais */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {goal.metricas.volume_clientes?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Clientes</p>
                        <p className="text-lg font-bold">{goal.metricas.volume_clientes.meta}</p>
                        <p className="text-xs text-green-600">
                          Realizado: {goal.metricas.volume_clientes.realizado || 0}
                        </p>
                      </div>
                    )}
                    {goal.metricas.faturamento_pecas?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Peças</p>
                        <p className="text-lg font-bold">{formatCurrency(goal.metricas.faturamento_pecas.meta)}</p>
                        <p className="text-xs text-green-600">
                          {formatCurrency(goal.metricas.faturamento_pecas.realizado || 0)}
                        </p>
                      </div>
                    )}
                    {goal.metricas.faturamento_servicos?.meta > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Serviços</p>
                        <p className="text-lg font-bold">{formatCurrency(goal.metricas.faturamento_servicos.meta)}</p>
                        <p className="text-xs text-green-600">
                          {formatCurrency(goal.metricas.faturamento_servicos.realizado || 0)}
                        </p>
                      </div>
                    )}
                    {goal.metricas.rentabilidade?.meta > 0 && (
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

      <GoalFormDialog
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingGoal(null);
        }}
        goal={editingGoal}
        employees={employees}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Users, DollarSign, Calendar, CheckCircle2, Circle, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SubtaskList from "./SubtaskList";
import AddSubtaskDialog from "./AddSubtaskDialog";

export default function ActionItem({ action, diagnosticId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: subtasks = [] } = useQuery({
    queryKey: ['subtasks', action.id],
    queryFn: async () => {
      const allSubtasks = await base44.entities.Subtask.list();
      return allSubtasks
        .filter(s => s.action_id === action.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      return await base44.entities.Action.update(action.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['actions']);
      createStatusNotification(action, action.status);
    }
  });

  const createStatusNotification = async (action, oldStatus) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.Notification.create({
        user_id: user.id,
        type: "status_alterado",
        title: "Status de ação atualizado",
        message: `A ação "${action.title}" foi alterada de "${getStatusLabel(oldStatus)}" para "${getStatusLabel(action.status)}"`,
        is_read: false
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
    }
  };

  const handleStatusChange = () => {
    const statusFlow = {
      'a_fazer': 'em_andamento',
      'em_andamento': 'concluido',
      'concluido': 'a_fazer'
    };
    
    const newStatus = statusFlow[action.status];
    updateStatusMutation.mutate(newStatus);
  };

  const getCategoryInfo = (category) => {
    const categories = {
      vendas: { icon: ShoppingCart, label: "Vendas e Atendimento", color: "bg-blue-100 text-blue-700" },
      prospeccao: { icon: Users, label: "Prospecção Ativa", color: "bg-purple-100 text-purple-700" },
      precificacao: { icon: DollarSign, label: "Precificação", color: "bg-green-100 text-green-700" },
      pessoas: { icon: Users, label: "Pessoas e Time", color: "bg-orange-100 text-orange-700" }
    };
    return categories[category] || categories.vendas;
  };

  const getStatusColor = (status) => {
    const colors = {
      'a_fazer': 'bg-gray-100 text-gray-700 border-gray-300',
      'em_andamento': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'concluido': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[status];
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status];
  };

  const categoryInfo = getCategoryInfo(action.category);
  const CategoryIcon = categoryInfo.icon;
  const completedSubtasks = subtasks.filter(s => s.status === "concluido").length;
  const overdueSubtasks = subtasks.filter(s => {
    if (s.status === "concluido") return false;
    if (!s.due_date) return false;
    return new Date(s.due_date) < new Date();
  }).length;

  return (
    <>
      <Card className="shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <button
              onClick={handleStatusChange}
              disabled={updateStatusMutation.isLoading}
              className="flex-shrink-0 mt-1"
            >
              {action.status === 'concluido' ? (
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              ) : action.status === 'em_andamento' ? (
                <Clock className="w-7 h-7 text-yellow-600" />
              ) : (
                <Circle className="w-7 h-7 text-gray-400 hover:text-blue-500 transition-colors" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className={categoryInfo.color}>
                  <CategoryIcon className="w-3 h-3 mr-1" />
                  {categoryInfo.label}
                </Badge>
                <Badge variant="outline" className={`border-2 ${getStatusColor(action.status)}`}>
                  {getStatusLabel(action.status)}
                </Badge>
                {action.due_date && (
                  <Badge variant="outline" className="border-gray-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(action.due_date), "dd 'de' MMM", { locale: ptBR })}
                  </Badge>
                )}
                {subtasks.length > 0 && (
                  <Badge variant="outline" className="border-blue-300">
                    {completedSubtasks}/{subtasks.length} subtarefas
                  </Badge>
                )}
                {overdueSubtasks > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    {overdueSubtasks} atrasada{overdueSubtasks > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${
                action.status === 'concluido' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}>
                {action.title}
              </h3>

              <p className="text-gray-600 leading-relaxed mb-4">
                {action.description}
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Ocultar Subtarefas
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Ver Subtarefas ({subtasks.length})
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Subtarefa
                  </Button>
                </div>

                {expanded && (
                  <SubtaskList 
                    subtasks={subtasks}
                    actionId={action.id}
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddSubtaskDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        actionId={action.id}
        diagnosticId={diagnosticId}
      />
    </>
  );
}
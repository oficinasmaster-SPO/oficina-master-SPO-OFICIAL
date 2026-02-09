import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, User, Calendar, Pencil, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import EditSubtaskDialog from "./EditSubtaskDialog";

export default function SubtaskList({ subtasks, actionId }) {
  const queryClient = useQueryClient();
  const [editingSubtask, setEditingSubtask] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, newStatus }) => {
      const updateData = { status: newStatus };
      if (newStatus === "concluido") {
        updateData.completed_at = new Date().toISOString();
      }
      return await base44.entities.Subtask.update(subtaskId, updateData);
    },
    onSuccess: async (updatedSubtask) => {
      queryClient.invalidateQueries(['subtasks']);
      
      if (updatedSubtask.responsible_user_id) {
        await base44.entities.Notification.create({
          user_id: updatedSubtask.responsible_user_id,
          subtask_id: updatedSubtask.id,
          type: "status_alterado",
          title: "Subtarefa atualizada",
          message: `A subtarefa "${updatedSubtask.title}" foi marcada como "${getStatusLabel(updatedSubtask.status)}"`,
          is_read: false
        });
      }
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId) => {
      await base44.entities.Subtask.delete(subtaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subtasks']);
    }
  });

  const handleStatusChange = (subtask) => {
    const statusFlow = {
      'a_fazer': 'em_andamento',
      'em_andamento': 'concluido',
      'concluido': 'a_fazer'
    };
    
    const newStatus = statusFlow[subtask.status];
    updateStatusMutation.mutate({ subtaskId: subtask.id, newStatus });
  };

  const getStatusLabel = (status) => {
    const labels = {
      'a_fazer': 'A Fazer',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído'
    };
    return labels[status];
  };

  const getStatusColor = (status) => {
    const colors = {
      'a_fazer': 'bg-gray-100 text-gray-700',
      'em_andamento': 'bg-yellow-100 text-yellow-700',
      'concluido': 'bg-green-100 text-green-700'
    };
    return colors[status];
  };

  const getResponsibleName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || "Não atribuído";
  };

  const isOverdue = (subtask) => {
    if (subtask.status === "concluido") return false;
    if (!subtask.due_date) return false;
    const today = new Date();
    const dueDate = new Date(subtask.due_date);
    return isPast(dueDate) && dueDate.toDateString() !== today.toDateString();
  };

  if (subtasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhuma subtarefa adicionada ainda.</p>
        <p className="text-sm mt-1">Clique em "Adicionar Subtarefa" para começar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 bg-gray-50 rounded-lg p-4">
        {subtasks.map((subtask) => {
          const overdue = isOverdue(subtask);
          
          return (
            <div
              key={subtask.id}
              className={`bg-white rounded-lg p-4 border-l-4 ${
                overdue ? 'border-red-500' : 
                subtask.status === 'concluido' ? 'border-green-500' :
                subtask.status === 'em_andamento' ? 'border-yellow-500' :
                'border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleStatusChange(subtask)}
                  className="flex-shrink-0 mt-1"
                  disabled={updateStatusMutation.isLoading}
                >
                  {subtask.status === 'concluido' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : subtask.status === 'em_andamento' ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={`font-medium ${
                      subtask.status === 'concluido' ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {subtask.title}
                    </h4>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingSubtask(subtask)}
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (window.confirm("Tem certeza que deseja remover esta subtarefa?")) {
                            deleteSubtaskMutation.mutate(subtask.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {subtask.description && (
                    <p className="text-sm text-gray-600 mb-2">{subtask.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(subtask.status)}>
                      {getStatusLabel(subtask.status)}
                    </Badge>
                    
                    {subtask.responsible_user_id && (
                      <Badge variant="outline" className="border-blue-300">
                        <User className="w-3 h-3 mr-1" />
                        {getResponsibleName(subtask.responsible_user_id)}
                      </Badge>
                    )}
                    
                    {subtask.due_date && (
                      <Badge 
                        variant="outline" 
                        className={overdue ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300"}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(subtask.due_date), "dd/MM/yyyy")}
                        {overdue && " - Atrasada"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingSubtask && (
        <EditSubtaskDialog
          open={!!editingSubtask}
          onClose={() => setEditingSubtask(null)}
          subtask={editingSubtask}
          actionId={actionId}
        />
      )}
    </>
  );
}
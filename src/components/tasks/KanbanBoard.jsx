import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Edit2, AlertCircle, Link2, Bell } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function KanbanBoard({ tasks, employees, onTaskUpdate, onTaskEdit, allTasks }) {
  const columns = [
    { id: "pendente", title: "Pendente", color: "bg-yellow-100 border-yellow-300" },
    { id: "em_andamento", title: "Em Andamento", color: "bg-blue-100 border-blue-300" },
    { id: "concluida", title: "Concluída", color: "bg-green-100 border-green-300" },
    { id: "cancelada", title: "Cancelada", color: "bg-gray-100 border-gray-300" }
  ];

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      // Verificar dependências
      if (newStatus === 'concluida' && task.dependencies?.length > 0) {
        const incompleteDeps = task.dependencies.filter(depId => {
          const depTask = allTasks.find(t => t.id === depId);
          return depTask && depTask.status !== 'concluida';
        });
        
        if (incompleteDeps.length > 0) {
          alert('Esta tarefa possui dependências que ainda não foram concluídas!');
          return;
        }
      }

      const updateData = {
        status: newStatus,
        progress: newStatus === 'concluida' ? 100 : newStatus === 'em_andamento' ? 50 : 0
      };

      if (newStatus === 'concluida') {
        updateData.completed_date = new Date().toISOString();
      }

      onTaskUpdate(taskId, updateData);
    }
  };

  const priorityConfig = {
    baixa: { color: "bg-gray-100 text-gray-700", icon: "○" },
    media: { color: "bg-blue-100 text-blue-700", icon: "◐" },
    alta: { color: "bg-orange-100 text-orange-700", icon: "◉" },
    urgente: { color: "bg-red-100 text-red-700", icon: "⚠" }
  };

  const TaskCard = ({ task, index }) => {
    const priority = priorityConfig[task.priority] || priorityConfig.media;
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'concluida';
    const assignedUsers = employees.filter(e => task.assigned_to?.includes(e.id));
    const hasDependencies = task.dependencies && task.dependencies.length > 0;
    const hasReminders = task.reminder_settings?.enabled;

    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "mb-3 transition-all",
              snapshot.isDragging && "opacity-50"
            )}
          >
            <Card className={cn(
              "hover:shadow-md transition-shadow cursor-move",
              isOverdue && "border-red-300 border-2"
            )}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={priority.color}>
                          {priority.icon} {task.priority}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Atrasada
                          </Badge>
                        )}
                        {hasDependencies && (
                          <Badge variant="outline" className="text-xs">
                            <Link2 className="w-3 h-3 mr-1" />
                            {task.dependencies.length}
                          </Badge>
                        )}
                        {hasReminders && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                        {task.title}
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTaskEdit(task)}
                      className="flex-shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Due Date */}
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}

                  {/* Assigned Users */}
                  {assignedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <div className="flex flex-wrap gap-1">
                        {assignedUsers.slice(0, 2).map(user => (
                          <Badge key={user.id} variant="secondary" className="text-xs">
                            {user.full_name.split(' ')[0]}
                          </Badge>
                        ))}
                        {assignedUsers.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{assignedUsers.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div key={column.id} className="flex flex-col h-full">
              <Card className={cn("border-2", column.color)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{column.title}</span>
                    <Badge variant="secondary">{columnTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 mt-3 p-2 rounded-lg min-h-[200px] transition-colors",
                      snapshot.isDraggingOver && "bg-blue-50"
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))}
                    {provided.placeholder}
                    
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Nenhuma tarefa
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
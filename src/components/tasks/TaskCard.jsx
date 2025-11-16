import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, AlertCircle, CheckCircle2, Clock, Edit2, Trash2 } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TaskCard({ task, employees, onEdit, onDelete, onStatusChange }) {
  const priorityConfig = {
    baixa: { color: "bg-gray-100 text-gray-700", icon: "○" },
    media: { color: "bg-blue-100 text-blue-700", icon: "◐" },
    alta: { color: "bg-orange-100 text-orange-700", icon: "◉" },
    urgente: { color: "bg-red-100 text-red-700", icon: "⚠" }
  };

  const statusConfig = {
    pendente: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    em_andamento: { color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    concluida: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    cancelada: { color: "bg-gray-100 text-gray-800", icon: AlertCircle }
  };

  const priority = priorityConfig[task.priority] || priorityConfig.media;
  const status = statusConfig[task.status] || statusConfig.pendente;
  const StatusIcon = status.icon;

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'concluida';

  const assignedUsers = employees.filter(e => task.assigned_to?.includes(e.id));

  return (
    <Card className={`hover:shadow-lg transition-all ${isOverdue ? 'border-red-300 border-2' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={priority.color}>
                {priority.icon} {task.priority}
              </Badge>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {task.status.replace('_', ' ')}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Atrasada
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-lg text-gray-900">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progresso */}
        {task.status !== 'pendente' && task.status !== 'cancelada' && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Progresso</span>
              <span className="font-bold text-gray-900">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        {/* Data de vencimento */}
        {task.due_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              Vencimento: {format(new Date(task.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Atribuídos */}
        {assignedUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-600" />
            <div className="flex flex-wrap gap-1">
              {assignedUsers.slice(0, 3).map(user => (
                <Badge key={user.id} variant="outline" className="text-xs">
                  {user.full_name}
                </Badge>
              ))}
              {assignedUsers.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{assignedUsers.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Equipe */}
        {task.assigned_team && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">
              Equipe: {task.assigned_team}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Ações rápidas */}
        {task.status !== 'concluida' && task.status !== 'cancelada' && (
          <div className="flex gap-2 pt-2 border-t">
            {task.status === 'pendente' && (
              <Button
                size="sm"
                onClick={() => onStatusChange(task.id, 'em_andamento')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Iniciar
              </Button>
            )}
            {task.status === 'em_andamento' && (
              <Button
                size="sm"
                onClick={() => onStatusChange(task.id, 'concluida')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Concluir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
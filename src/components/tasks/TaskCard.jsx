import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, AlertCircle, CheckCircle2, Clock, Edit2, Trash2, Repeat, Timer, Wrench, Car, RotateCcw, Shield, ListChecks, Target, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
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

  const taskTypeConfig = {
    geral: { color: "bg-gray-100 text-gray-700", icon: Wrench, label: "Geral" },
    qgp_solicitacao_servico: { color: "bg-blue-100 text-blue-700", icon: Car, label: "Serviço" },
    qgp_aviso_entrega: { color: "bg-green-100 text-green-700", icon: Clock, label: "Entrega" },
    qgp_tcmp2: { color: "bg-purple-100 text-purple-700", icon: Timer, label: "TCMP²" },
    qgp_retrabalho: { color: "bg-red-100 text-red-700", icon: RotateCcw, label: "Retrabalho" },
    qgp_aguardando: { color: "bg-yellow-100 text-yellow-700", icon: AlertCircle, label: "Aguardando" }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  };

  const priority = priorityConfig[task.priority] || priorityConfig.media;
  const status = statusConfig[task.status] || statusConfig.pendente;
  const StatusIcon = status.icon;
  const taskType = taskTypeConfig[task.task_type] || taskTypeConfig.geral;
  const TaskTypeIcon = taskType.icon;

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'concluida';
  const isQGP = task.task_type && task.task_type.startsWith("qgp_");

  const assignedUsers = employees.filter(e => task.assigned_to?.includes(e.id));
  const [showDetails, setShowDetails] = useState(false);
  const hasAIDetails = task.ai_epi || task.ai_specificity || task.ai_success_indicator || (task.ai_steps && task.ai_steps.length > 0);

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
              {task.is_recurring && (
                <Badge className="bg-purple-100 text-purple-700">
                  <Repeat className="w-3 h-3 mr-1" />
                  Recorrente
                </Badge>
              )}
              {isQGP && (
                <Badge className={taskType.color}>
                  <TaskTypeIcon className="w-3 h-3 mr-1" />
                  {taskType.label}
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

        {/* Tempo previsto x executado */}
        {(task.predicted_time_minutes > 0 || task.actual_time_minutes > 0) && (
          <div className="flex items-center gap-3 text-sm">
            <Timer className="w-4 h-4 text-gray-600" />
            <div className="flex gap-2">
              {task.predicted_time_minutes > 0 && (
                <Badge variant="outline" className="text-xs">
                  Prev: {formatMinutes(task.predicted_time_minutes)}
                </Badge>
              )}
              {task.actual_time_minutes > 0 && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    task.predicted_time_minutes && task.actual_time_minutes > task.predicted_time_minutes
                      ? 'border-red-300 text-red-700'
                      : 'border-green-300 text-green-700'
                  }`}
                >
                  Exec: {formatMinutes(task.actual_time_minutes)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Dados QGP */}
        {isQGP && task.qgp_data && (
          <div className="bg-orange-50 rounded-lg p-2 text-xs space-y-1">
            {task.qgp_data.os_number && (
              <div className="flex justify-between">
                <span className="text-gray-600">O.S.:</span>
                <span className="font-medium">{task.qgp_data.os_number}</span>
              </div>
            )}
            {task.qgp_data.vehicle_plate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Placa:</span>
                <span className="font-medium">{task.qgp_data.vehicle_plate}</span>
              </div>
            )}
            {task.qgp_data.client_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{task.qgp_data.client_name}</span>
              </div>
            )}
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

        {/* Detalhes IA */}
        {hasAIDetails && (
          <div className="pt-2 border-t">
             <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-purple-700 hover:text-purple-800 hover:bg-purple-50 h-8"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="flex items-center gap-1 text-xs font-medium">
                <Sparkles className="w-3 h-3" /> Detalhes Operacionais
              </span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            
            {showDetails && (
              <div className="mt-2 space-y-2 text-sm bg-purple-50 p-2 rounded border border-purple-100">
                {task.ai_epi && (
                  <div className="flex gap-2 items-start">
                    <Shield className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-xs text-purple-900 block">EPI:</span>
                      <span className="text-gray-700 text-xs">{task.ai_epi}</span>
                    </div>
                  </div>
                )}
                {task.ai_specificity && (
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-xs text-purple-900 block">Atenção:</span>
                      <span className="text-gray-700 text-xs">{task.ai_specificity}</span>
                    </div>
                  </div>
                )}
                {task.ai_success_indicator && (
                  <div className="flex gap-2 items-start">
                    <Target className="w-3 h-3 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-xs text-purple-900 block">Sucesso se:</span>
                      <span className="text-gray-700 text-xs">{task.ai_success_indicator}</span>
                    </div>
                  </div>
                )}
                {task.ai_steps && task.ai_steps.length > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center gap-1 font-semibold text-xs text-purple-900 mb-1">
                      <ListChecks className="w-3 h-3" /> Passo a Passo:
                    </div>
                    <ul className="list-decimal list-inside space-y-0.5">
                      {task.ai_steps.map((step, i) => (
                        <li key={i} className="text-gray-700 text-xs pl-1">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
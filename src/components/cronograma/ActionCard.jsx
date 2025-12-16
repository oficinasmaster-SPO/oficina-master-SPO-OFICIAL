import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Circle, Clock, CheckCircle2, AlertCircle, AlertTriangle, 
  Calendar, User, ChevronRight, TrendingUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActionCard({ action, onClick }) {
  const getStatusConfig = () => {
    const configs = {
      a_fazer: { 
        icon: Circle, 
        color: "text-gray-400", 
        label: "A Fazer",
        badgeClass: "bg-gray-100 text-gray-700"
      },
      em_andamento: { 
        icon: Clock, 
        color: "text-blue-600", 
        label: "Em Andamento",
        badgeClass: "bg-blue-100 text-blue-700"
      },
      concluido: { 
        icon: CheckCircle2, 
        color: "text-green-600", 
        label: "Concluído",
        badgeClass: "bg-green-100 text-green-700"
      }
    };
    return configs[action.status] || configs.a_fazer;
  };

  const getPriorityLevel = () => {
    if (action.prazoStatus === 'atrasado') return 'critical';
    if (action.paralisado) return 'warning';
    if (action.prazoStatus === 'proximo') return 'attention';
    return 'normal';
  };

  const priorityStyles = {
    critical: "border-l-4 border-l-red-600 bg-red-50",
    warning: "border-l-4 border-l-orange-500 bg-orange-50",
    attention: "border-l-4 border-l-yellow-500 bg-yellow-50",
    normal: "border-l-4 border-l-gray-200 bg-white"
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const priority = getPriorityLevel();

  return (
    <div
      onClick={onClick}
      className={`
        ${priorityStyles[priority]}
        border rounded-lg p-4 
        hover:shadow-lg transition-all cursor-pointer
        ${priority === 'critical' ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header com Título */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-gray-900 text-lg">
              {action.title}
            </h3>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>

          {/* Badges de Status */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={statusConfig.badgeClass}>
              {statusConfig.label}
            </Badge>

            {/* Alerta de Atraso */}
            {action.prazoStatus === 'atrasado' && (
              <Badge className="bg-red-100 text-red-700 border border-red-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Atrasada {action.due_date && 
                  `(${Math.abs(differenceInDays(new Date(action.due_date), new Date()))}d)`
                }
              </Badge>
            )}

            {/* Alerta de Paralisação */}
            {action.paralisado && (
              <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Sem atualização há {action.updatedDaysAgo}d
              </Badge>
            )}

            {/* Prazo Próximo */}
            {action.prazoStatus === 'proximo' && (
              <Badge className="bg-yellow-100 text-yellow-700">
                <Clock className="w-3 h-3 mr-1" />
                Prazo em {differenceInDays(new Date(action.due_date), new Date())}d
              </Badge>
            )}

            {/* Responsável */}
            {action.responsible && (
              <Badge variant="outline" className="border-gray-300">
                <User className="w-3 h-3 mr-1" />
                {action.responsible.full_name}
              </Badge>
            )}

            {/* Data de Vencimento */}
            {action.due_date && (
              <Badge variant="outline" className="border-gray-300">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(action.due_date), "dd/MM/yy")}
              </Badge>
            )}

            {/* Progresso de Subtarefas */}
            {action.totalSubtasks > 0 && (
              <Badge variant="outline" className="border-blue-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                {action.completedSubtasks}/{action.totalSubtasks} tarefas
              </Badge>
            )}

            {/* Subtarefas Atrasadas */}
            {action.overdueSubtasks > 0 && (
              <Badge className="bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {action.overdueSubtasks} tarefa(s) atrasada(s)
              </Badge>
            )}
          </div>

          {/* Indicadores Temporais */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 border-t pt-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Criada há <strong>{action.createdDaysAgo}</strong> dias
            </span>
            {action.updatedDaysAgo > 0 && (
              <span className={`flex items-center gap-1 ${
                action.paralisado ? 'text-orange-600 font-semibold' : ''
              }`}>
                <TrendingUp className="w-3 h-3" />
                Última atualização há <strong>{action.updatedDaysAgo}</strong> dias
              </span>
            )}
            {action.createdDaysAgo > 30 && (
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                Ação antiga
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
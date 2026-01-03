import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Users, Target, Clock, Award } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChallengeCard({ challenge, userProgress, isManager, onEdit, onDelete, onFinalize, onUpdateProgress }) {
  const typeConfig = {
    semanal: { color: "bg-blue-100 text-blue-800", label: "Semanal" },
    mensal: { color: "bg-purple-100 text-purple-800", label: "Mensal" },
    especial: { color: "bg-yellow-100 text-yellow-800", label: "Especial" }
  };

  const targetConfig = {
    individual: { icon: Target, label: "Individual" },
    equipe: { icon: Users, label: "Equipe" },
    oficina: { icon: Trophy, label: "Oficina" }
  };

  const config = typeConfig[challenge.type] || typeConfig.semanal;
  const targetConf = targetConfig[challenge.target_type] || targetConfig.individual;
  const TargetIcon = targetConf.icon;

  const daysLeft = differenceInDays(new Date(challenge.end_date), new Date());
  const progress = userProgress 
    ? Math.min((userProgress.current_value / challenge.goal_value) * 100, 100)
    : 0;

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={config.color}>{config.label}</Badge>
              <Badge variant="outline">
                <TargetIcon className="w-3 h-3 mr-1" />
                {targetConf.label}
              </Badge>
              {challenge.target_area !== 'todos' && (
                <Badge variant="secondary">{challenge.target_area}</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{challenge.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progresso (Participante) */}
        {!isManager && userProgress && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Seu Progresso</span>
              <span className="font-bold text-gray-900">
                {userProgress.current_value.toFixed(0)}/{challenge.goal_value}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {userProgress.completed && (
              <Badge className="mt-2 bg-green-100 text-green-800">
                ✓ Concluído!
              </Badge>
            )}
          </div>
        )}

        {/* Progresso (Gerente/Geral) - Exibe progresso se for meta de oficina ou resumo */}
        {isManager && challenge.target_type === 'oficina' && (
           <div>
             <div className="flex items-center justify-between text-sm mb-1">
               <span className="text-gray-600">Progresso da Oficina</span>
               <span className="font-bold text-gray-900">
                 {/* Busca o valor do participante 'oficina' ou o primeiro participante (assumindo 1 para oficina) */}
                 {(challenge.participants?.find(p => p.user_id === challenge.workshop_id)?.current_value || 0).toFixed(0)}/{challenge.goal_value}
               </span>
             </div>
             <Progress value={Math.min(((challenge.participants?.find(p => p.user_id === challenge.workshop_id)?.current_value || 0) / challenge.goal_value) * 100, 100)} className="h-2" />
           </div>
        )}

        {/* Recompensa */}
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-900">Recompensa</span>
          </div>
          <span className="text-sm font-bold text-yellow-800">{challenge.reward_xp} XP</span>
        </div>

        {/* Prazo */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Último dia!'}
          </span>
        </div>

        {/* Métrica */}
        <div className="text-xs text-gray-500">
          Métrica: <span className="font-medium capitalize">{challenge.metric.replace('_', ' ')}</span>
        </div>

        {/* Ações de Gerenciamento */}
        {isManager && (
          <div className="pt-4 border-t flex flex-wrap gap-2 justify-end">
             {challenge.status === 'ativo' && onUpdateProgress && (
                <Button variant="outline" size="sm" onClick={() => onUpdateProgress(challenge)}>
                  Atualizar Progresso
                </Button>
             )}
             {challenge.status === 'ativo' && onFinalize && (
                <Button variant="secondary" size="sm" onClick={() => onFinalize(challenge)} className="bg-green-100 text-green-800 hover:bg-green-200">
                  Finalizar
                </Button>
             )}
             {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(challenge)}>
                  Editar
                </Button>
             )}
             {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(challenge.id)} className="text-red-500 hover:bg-red-50">
                  Excluir
                </Button>
             )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { Button } from "@/components/ui/button";
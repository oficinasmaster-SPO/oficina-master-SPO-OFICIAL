import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, TrendingUp, Target, BarChart3, Calendar } from "lucide-react";
import ActionPlanTimeline from "./ActionPlanTimeline";

export default function ActionPlanDetails({ 
  plan, 
  onUpdateActivity, 
  onBack 
}) {
  const [activeTab, setActiveTab] = useState("resumo");

  if (!plan?.plan_data) return null;

  const { plan_data } = plan;
  const activities = plan_data.implementation_schedule || [];
  const pendingActivities = activities.filter(a => a.status === 'pendente');
  const inProgressActivities = activities.filter(a => a.status === 'em_andamento');
  const completedActivities = activities.filter(a => a.status === 'concluida');

  const handleActivityStatusChange = (activityIndex, newStatus) => {
    if (onUpdateActivity) {
      onUpdateActivity(activityIndex, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Plano de Ação Detalhado</h2>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Voltar
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="direcionamentos">Direcionamentos</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="proximos">Próximos Passos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Resumo Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line">
                {plan_data.diagnostic_summary}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Objetivo Principal (90 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-gray-900">
                {plan_data.main_objective}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-orange-600">{pendingActivities.length}</p>
                <p className="text-sm text-gray-600">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{inProgressActivities.length}</p>
                <p className="text-sm text-gray-600">Em Andamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{completedActivities.length}</p>
                <p className="text-sm text-gray-600">Concluídas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="direcionamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direcionamentos Estratégicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan_data.action_directions?.map((direction, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{direction.area_name}</h4>
                      <Badge className={
                        direction.priority === 'alta' ? 'bg-red-100 text-red-700' :
                        direction.priority === 'media' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }>
                        {direction.priority === 'alta' ? 'Alta Prioridade' :
                         direction.priority === 'media' ? 'Média Prioridade' :
                         'Baixa Prioridade'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{direction.direction}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {plan_data.timeline_plan && (
            <ActionPlanTimeline timelinePlan={plan_data.timeline_plan} />
          )}
        </TabsContent>

        <TabsContent value="cronograma" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Cronograma de Implementação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.map((activity, idx) => (
                  <ActivityItem 
                    key={idx}
                    activity={activity}
                    index={idx}
                    onStatusChange={handleActivityStatusChange}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Indicadores de Acompanhamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plan_data.key_indicators?.map((indicator, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{indicator.indicator_name}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Valor Atual</p>
                        <p className="font-semibold text-gray-900">{indicator.current_value}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Meta</p>
                        <p className="font-semibold text-green-600">{indicator.target_value}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Frequência</p>
                        <p className="font-semibold text-gray-900">{indicator.measurement_frequency}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proximos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Próximos Passos (Esta Semana)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan_data.next_steps_week?.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-orange-600 font-bold">{idx + 1}.</span>
                    <p className="text-gray-700">{step}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityItem({ activity, index, onStatusChange }) {
  const statusIcons = {
    pendente: <Circle className="w-5 h-5 text-gray-400" />,
    em_andamento: <Clock className="w-5 h-5 text-blue-500" />,
    concluida: <CheckCircle className="w-5 h-5 text-green-500" />
  };

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <button 
        onClick={() => {
          const nextStatus = activity.status === 'pendente' ? 'em_andamento' :
                           activity.status === 'em_andamento' ? 'concluida' : 'pendente';
          onStatusChange(index, nextStatus);
        }}
        className="mt-1"
      >
        {statusIcons[activity.status]}
      </button>
      <div className="flex-1">
        <h4 className={`font-semibold ${activity.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {activity.activity_name}
        </h4>
        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="text-xs">
            Prazo: {activity.deadline_days} dias
          </Badge>
          {activity.completed_date && (
            <p className="text-xs text-green-600">
              Concluída em {new Date(activity.completed_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
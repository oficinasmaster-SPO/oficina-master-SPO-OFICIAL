import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  FileText,
  MessageSquare,
  Printer,
  Share2,
  ChevronRight,
  AlertCircle,
  History
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PlanoAceleracaoMensal({ plan, workshop, onRefine, onUpdateActivity }) {
  const [expandedPillar, setExpandedPillar] = useState(null);

  if (!plan || !plan.plan_data) {
    return (
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-600 mb-3" />
          <p className="text-gray-700 font-medium">Nenhum plano ativo encontrado para este mês</p>
          <p className="text-sm text-gray-600 mt-2">Clique em "Gerar Plano de Aceleração" para começar</p>
        </CardContent>
      </Card>
    );
  }

  const data = plan.plan_data;
  const activitiesDone = data.implementation_schedule?.filter(a => a.status === 'concluida').length || 0;
  const totalActivities = data.implementation_schedule?.length || 1;
  const progressPercentage = Math.round((activitiesDone / totalActivities) * 100);

  const getPriorityColor = (priority) => {
    const colors = {
      alta: "bg-red-100 text-red-700 border-red-300",
      media: "bg-yellow-100 text-yellow-700 border-yellow-300",
      baixa: "bg-green-100 text-green-700 border-green-300"
    };
    return colors[priority] || colors.media;
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: "bg-gray-100 text-gray-700",
      em_andamento: "bg-blue-100 text-blue-700",
      concluida: "bg-green-100 text-green-700"
    };
    return colors[status] || colors.pendente;
  };

  const handleActivityToggle = async (activityIndex, newStatus) => {
    if (onUpdateActivity) {
      await onUpdateActivity(activityIndex, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Plano */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">Plano de Aceleração - {workshop?.name}</CardTitle>
              <p className="text-indigo-100">
                Referência: {format(new Date(plan.reference_month + '-01'), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              {plan.version > 1 && (
                <Badge className="mt-2 bg-white text-indigo-600">
                  <History className="w-3 h-3 mr-1" />
                  Versão {plan.version} - Refinado
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{progressPercentage}%</div>
              <p className="text-sm text-indigo-100">Concluído</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Ações Rápidas */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={onRefine} variant="outline" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Refinar com Feedback
        </Button>
        <Button variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Plano
        </Button>
        <Button variant="outline" className="gap-2">
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
      </div>

      {/* Tabs do Plano */}
      <Tabs defaultValue="resumo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="pilares">Pilares</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="proximos">Próximos Passos</TabsTrigger>
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Resumo do Diagnóstico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {data.diagnostic_summary}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Target className="w-5 h-5" />
                Objetivo Principal (90 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 font-medium text-lg">
                {data.main_objective_90_days}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pilares */}
        <TabsContent value="pilares" className="space-y-4">
          {data.pillar_directions?.map((pillar, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    {pillar.pillar_name}
                  </CardTitle>
                  <Badge className={getPriorityColor(pillar.priority)}>
                    {pillar.priority?.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{pillar.direction}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Cronograma de Implementação */}
        <TabsContent value="cronograma" className="space-y-4">
          <div className="grid gap-4">
            {data.implementation_schedule?.map((activity, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={activity.status === 'concluida'}
                        onChange={(e) => handleActivityToggle(index, e.target.checked ? 'concluida' : 'pendente')}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h4 className={`font-semibold text-lg ${activity.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {activity.activity_name}
                        </h4>
                        <p className="text-gray-600 mt-1">{activity.description}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.status === 'concluida' ? 'Concluída' : activity.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                          </Badge>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {activity.deadline_days} dias
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Indicadores */}
        <TabsContent value="indicadores" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {data.key_indicators?.map((indicator, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">{indicator.indicator_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Atual:</span>
                      <span className="font-semibold text-gray-900">{indicator.current_value}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Meta:</span>
                      <span className="font-semibold text-green-600">{indicator.target_value}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Frequência:</span>
                      <span className="text-sm">{indicator.measurement_frequency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Próximos Passos */}
        <TabsContent value="proximos">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <ChevronRight className="w-5 h-5" />
                Foco da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.next_steps_week?.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-800">{step}</span>
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
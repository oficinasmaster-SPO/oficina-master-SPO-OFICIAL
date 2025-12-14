import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle as CardTitle2 } from "@/components/ui/card";
import { FileText, Target, Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ViewVersionModal({ open, onClose, version }) {
  if (!version || !version.plan_data) return null;

  const data = version.plan_data;

  const getPriorityColor = (priority) => {
    const colors = {
      alta: "bg-red-100 text-red-700 border-red-300",
      media: "bg-yellow-100 text-yellow-700 border-yellow-300",
      baixa: "bg-green-100 text-green-700 border-green-300"
    };
    return colors[priority] || colors.media;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              Versão {version.version} do Plano
            </DialogTitle>
            <div className="flex gap-2">
              {version.status === 'ativo' && (
                <Badge className="bg-green-600 text-white">Ativa</Badge>
              )}
              {version.version > 1 && (
                <Badge variant="outline" className="text-purple-600">Refinada</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Criada em {format(new Date(version.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="pilares">Pilares</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle2 className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Resumo do Diagnóstico
                </CardTitle2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {data.diagnostic_summary}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle2 className="flex items-center gap-2 text-green-900">
                  <Target className="w-5 h-5" />
                  Objetivo Principal (90 dias)
                </CardTitle2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 font-medium text-lg">
                  {data.main_objective_90_days}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pilares" className="space-y-4 mt-4">
            {data.pillar_directions?.map((pillar, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle2 className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      {pillar.pillar_name}
                    </CardTitle2>
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

          <TabsContent value="cronograma" className="space-y-4 mt-4">
            {data.implementation_schedule?.map((activity, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-1 ${activity.status === 'concluida' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-900">
                        {activity.activity_name}
                      </h4>
                      <p className="text-gray-600 mt-1">{activity.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="outline">
                          {activity.status}
                        </Badge>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {activity.deadline_days} dias
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="indicadores" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {data.key_indicators?.map((indicator, index) => (
                <Card key={index} className="border-2">
                  <CardHeader>
                    <CardTitle2 className="text-lg">{indicator.indicator_name}</CardTitle2>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
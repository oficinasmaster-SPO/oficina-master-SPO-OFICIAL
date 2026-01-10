import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Clock, AlertCircle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function GargalosConsultoresRealtime() {
  const queryClient = useQueryClient();

  const { data: saturacaoData, isLoading, refetch } = useQuery({
    queryKey: ['saturacao-real-consultores'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calcularSaturacaoReal', {});
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });

  const getStatusColor = (status) => {
    const cores = {
      critico: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-600' },
      alto: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-600' },
      medio: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-600' },
      baixo: { bg: 'bg-green-100', text: 'text-green-800', badge: 'bg-green-600' }
    };
    return cores[status] || cores.baixo;
  };

  const getProgressColor = (indice) => {
    if (indice > 150) return 'bg-red-600';
    if (indice > 100) return 'bg-orange-600';
    if (indice > 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  if (isLoading) {
    return <div className="text-center py-8">Calculando saturação...</div>;
  }

  if (!saturacaoData?.consultores) {
    return <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>;
  }

  const consultores = saturacaoData.consultores;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Críticos ({`>`}150%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {consultores.filter(c => c.indice_saturacao > 150).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Altos (100-150%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {consultores.filter(c => c.indice_saturacao > 100 && c.indice_saturacao <= 150).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Médios (70-100%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {consultores.filter(c => c.indice_saturacao > 70 && c.indice_saturacao <= 100).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saudáveis ({`<`}70%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {consultores.filter(c => c.indice_saturacao <= 70).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Saturação Real dos Consultores</CardTitle>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Cálculo inclui: atendimentos + tarefas do backlog + ajuste por tarefas vencidas
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consultores.map((consultor) => {
              const cor = getStatusColor(consultor.status_gargalo);
              const progressCor = getProgressColor(consultor.indice_saturacao);

              return (
                <div key={consultor.consultor_id} className={`p-4 rounded-lg border ${cor.bg}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${cor.badge}`}></div>
                      <div>
                        <h3 className="font-semibold">{consultor.consultor_nome}</h3>
                        <p className="text-xs text-gray-600">{consultor.consultor_email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${cor.badge} text-white`}>
                        {(consultor.indice_saturacao ?? 0).toFixed(0)}%
                      </Badge>
                      {consultor.status_gargalo === 'critico' && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>

                  <Progress value={Math.min(consultor.indice_saturacao, 200)} max={200} className="mb-3" />

                  {/* Tabela de Carga */}
                  <div className="overflow-x-auto text-xs mb-3">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left font-semibold">Tipo</th>
                          <th className="border p-2 text-center">Realizadas</th>
                          <th className="border p-2 text-center">Previstas</th>
                          <th className="border p-2 text-center">Em Atraso</th>
                          <th className="border p-2 text-center font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50">
                          <td className="border p-2 font-semibold">Atendimentos</td>
                          <td className="border p-2 text-center text-green-700 font-semibold">
                            {consultor.atendimentos_realizados?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center text-blue-700 font-semibold">
                            {consultor.atendimentos_previstos?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center text-red-700 font-semibold">
                            {consultor.atendimentos_em_atraso?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center font-bold bg-gray-50">
                            {consultor.total_atendimentos?.horas ?? '0'}h
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="border p-2 font-semibold">Tarefas</td>
                          <td className="border p-2 text-center text-green-700 font-semibold">
                            {consultor.tarefas_realizadas?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center text-blue-700 font-semibold">
                            {consultor.tarefas_previstas?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center text-red-700 font-semibold">
                            {consultor.tarefas_em_atraso?.horas ?? '0'}h
                          </td>
                          <td className="border p-2 text-center font-bold bg-gray-50">
                            {consultor.total_tarefas?.horas ?? '0'}h
                          </td>
                        </tr>
                        <tr className="bg-blue-50 font-bold">
                          <td className="border p-2">TOTAL</td>
                          <td className="border p-2 text-center text-green-700">
                            {((consultor.atendimentos_realizados?.horas ?? 0) + (consultor.tarefas_realizadas?.horas ?? 0)).toFixed(1)}h
                          </td>
                          <td className="border p-2 text-center text-blue-700">
                            {((consultor.atendimentos_previstos?.horas ?? 0) + (consultor.tarefas_previstas?.horas ?? 0)).toFixed(1)}h
                          </td>
                          <td className="border p-2 text-center text-red-700">
                            {((consultor.atendimentos_em_atraso?.horas ?? 0) + (consultor.tarefas_em_atraso?.horas ?? 0)).toFixed(1)}h
                          </td>
                          <td className="border p-2 text-center bg-blue-100">
                            {(consultor.carga_total_prevista ?? 0).toFixed(1)}h
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-auto p-0 text-blue-600 hover:text-blue-800">
                        <Info className="w-4 h-4 mr-1" />
                        Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{consultor.consultor_nome}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <tbody>
                              <tr className="border-b">
                                <td className="p-2 font-semibold text-gray-700">Horas Semanais Disponíveis</td>
                                <td className="p-2 text-right font-bold">{consultor.horas_semanais_disponiveis}h</td>
                              </tr>
                              <tr className="border-b bg-green-50">
                                <td className="p-2 font-semibold text-green-700">Carga Realizada (Total)</td>
                                <td className="p-2 text-right font-bold text-green-700">{(consultor.carga_total_realizada ?? 0).toFixed(1)}h</td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-2 font-semibold text-gray-700">Atendimentos (Realizado)</td>
                                <td className="p-2 text-right">{consultor.atendimentos_realizados?.horas ?? '0'}h ({consultor.atendimentos_realizados?.qtd ?? 0})</td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-2 font-semibold text-gray-700">Tarefas (Realizadas)</td>
                                <td className="p-2 text-right">{consultor.tarefas_realizadas?.horas ?? '0'}h ({consultor.tarefas_realizadas?.qtd ?? 0})</td>
                              </tr>
                              <tr className="border-b bg-blue-50">
                                <td className="p-2 font-semibold text-blue-700">Carga Prevista</td>
                                <td className="p-2 text-right font-bold text-blue-700">{(consultor.carga_total_prevista ?? 0).toFixed(1)}h</td>
                              </tr>
                              <tr>
                                <td className="p-2 font-semibold text-red-700">Saturação Total</td>
                                <td className="p-2 text-right font-bold text-lg text-red-700">{(consultor.indice_saturacao ?? 0).toFixed(0)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-600">Tarefas Vencidas</p>
                            <p className="font-semibold text-red-600">{consultor.qtd_tarefas_vencidas}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tarefas Críticas</p>
                            <p className="font-semibold text-orange-600">{consultor.qtd_tarefas_criticas}</p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            Como funciona o cálculo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Saturação = (Horas Atendimentos + Horas Tarefas) / 40h × 100</strong></p>
          <p>+ <strong>Ajuste: +20% por cada tarefa vencida</strong></p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Crítico: {`>`} 150% (sobrecarga severa)</li>
            <li>Alto: 100-150% (sobrecarga)</li>
            <li>Médio: 70-100% (capacidade boa)</li>
            <li>Baixo: {`<`} 70% (capacidade disponível)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaturacaoConsultorItem from "./SaturacaoConsultorItem";
import SaturacaoConsultorModal from "./SaturacaoConsultorModal";

export default function GargalosConsultoresRealtime() {
  const queryClient = useQueryClient();
  const [selectedConsultor, setSelectedConsultor] = useState(null);

  const { data: saturacaoData, isLoading, refetch } = useQuery({
    queryKey: ['saturacao-real-consultores'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calcularSaturacaoReal', {});
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  });

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

        <SaturacaoConsultorModal 
        consultor={selectedConsultor}
        open={!!selectedConsultor}
        onOpenChange={(open) => !open && setSelectedConsultor(null)}
        />

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
          <div className="space-y-2">
            {consultores.map((consultor) => (
              <SaturacaoConsultorItem 
                key={consultor.consultor_id}
                consultor={consultor}
                onExpand={setSelectedConsultor}
              />
            ))}
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
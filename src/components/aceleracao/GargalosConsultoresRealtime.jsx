import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import SaturacaoConsultorItem from "./SaturacaoConsultorItem";
import SaturacaoConsultorModal from "./SaturacaoConsultorModal";
import SaturacaoLegendaModal from "./SaturacaoLegendaModal";
import PeriodFilter from "./PeriodFilter";

export default function GargalosConsultoresRealtime() {
  const [selectedConsultor, setSelectedConsultor] = useState(null);
  const [showLegenda, setShowLegenda] = useState(false);
  const [period, setPeriod] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 30), "yyyy-MM-dd")
  });

  const { data: saturacaoData, isLoading, refetch } = useQuery({
    queryKey: ['saturacao-real-consultores', period.startDate, period.endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('calcularSaturacaoReal', {
        startDate: period.startDate,
        endDate: period.endDate
      });
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!period.startDate && !!period.endDate,
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

      <SaturacaoLegendaModal open={showLegenda} onOpenChange={setShowLegenda} />

        <SaturacaoConsultorModal 
        consultor={selectedConsultor}
        open={!!selectedConsultor}
        onOpenChange={(open) => !open && setSelectedConsultor(null)}
        period={period}
        />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Saturação Real dos Consultores</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowLegenda(true)}
                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-xs text-gray-600">
              Cálculo inclui: atendimentos + tarefas do backlog + ajuste por tarefas vencidas
            </p>
            <PeriodFilter onPeriodChange={setPeriod} defaultPeriod="30" />
          </div>
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


    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PeriodFilter from "./PeriodFilter";
import { format, addDays } from "date-fns";

export default function SaturacaoConsultorModal({ consultor, open, onOpenChange, period: initialPeriod }) {
  const [consultorData, setConsultorData] = useState(consultor);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState(initialPeriod || {
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 30), "yyyy-MM-dd")
  });

  // Sincronizar com o período inicial quando mudar
  useEffect(() => {
    if (initialPeriod) {
      setPeriod(initialPeriod);
    }
  }, [initialPeriod?.startDate, initialPeriod?.endDate]);

  useEffect(() => {
    if (open && consultor) {
      console.log('Modal: Carregando dados para período:', period);
      loadConsultorData();
    }
  }, [period.startDate, period.endDate, open, consultor?.consultor_id]);

  const loadConsultorData = async () => {
    if (!consultor?.consultor_id) return;
    setIsLoading(true);
    try {
      console.log('Modal: Invocando função com período:', period);
      const response = await base44.functions.invoke('calcularSaturacaoReal', {
        startDate: period.startDate,
        endDate: period.endDate
      });
      console.log('Modal: Resposta recebida:', response.data);
      const consultores = response.data?.consultores || [];
      const updated = consultores.find(c => c.consultor_id === consultor.consultor_id);
      console.log('Modal: Dados atualizados do consultor:', updated);
      if (updated) {
        setConsultorData(updated);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!consultorData) return null;

  const getStatusColor = (status) => {
    const cores = {
      critico: { text: 'text-red-800', badge: 'bg-red-600' },
      alto: { text: 'text-orange-800', badge: 'bg-orange-600' },
      medio: { text: 'text-yellow-800', badge: 'bg-yellow-600' },
      baixo: { text: 'text-green-800', badge: 'bg-green-600' }
    };
    return cores[status] || cores.baixo;
  };

  const cor = getStatusColor(consultorData.status_gargalo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${cor.badge}`}></div>
              <DialogTitle>{consultorData.consultor_nome}</DialogTitle>
              <Badge className={`${cor.badge} text-white`}>
                {(consultorData.indice_saturacao ?? 0).toFixed(0)}%
              </Badge>
            </div>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <div className="mt-3">
            <PeriodFilter 
              onPeriodChange={setPeriod} 
              defaultPeriod={initialPeriod?.startDate && initialPeriod?.endDate ? null : "30"}
            />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
          {/* Barra de Progress */}
          <div>
            <p className="text-sm font-semibold mb-2">Saturação Total</p>
            <Progress 
              value={Math.min(consultorData.indice_saturacao, 200)} 
              max={200}
            />
          </div>

          {/* Tabela de Carga */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Carga de Trabalho</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
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
                      {consultorData.atendimentos_realizados?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center text-blue-700 font-semibold">
                      {consultorData.atendimentos_previstos?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center text-red-700 font-semibold">
                      {consultorData.atendimentos_em_atraso?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center font-bold bg-gray-50">
                      {consultorData.total_atendimentos?.horas ?? '0'}h
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border p-2 font-semibold">Tarefas</td>
                    <td className="border p-2 text-center text-green-700 font-semibold">
                      {consultorData.tarefas_realizadas?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center text-blue-700 font-semibold">
                      {consultorData.tarefas_previstas?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center text-red-700 font-semibold">
                      {consultorData.tarefas_em_atraso?.horas ?? '0'}h
                    </td>
                    <td className="border p-2 text-center font-bold bg-gray-50">
                      {consultorData.total_tarefas?.horas ?? '0'}h
                    </td>
                  </tr>
                  <tr className="bg-blue-50 font-bold">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2 text-center text-green-700">
                      {((consultorData.atendimentos_realizados?.horas ?? 0) + (consultorData.tarefas_realizadas?.horas ?? 0)).toFixed(1)}h
                    </td>
                    <td className="border p-2 text-center text-blue-700">
                      {((consultorData.atendimentos_previstos?.horas ?? 0) + (consultorData.tarefas_previstas?.horas ?? 0)).toFixed(1)}h
                    </td>
                    <td className="border p-2 text-center text-red-700">
                      {((consultorData.atendimentos_em_atraso?.horas ?? 0) + (consultorData.tarefas_em_atraso?.horas ?? 0)).toFixed(1)}h
                    </td>
                    <td className="border p-2 text-center bg-blue-100">
                      {(consultorData.carga_total_prevista ?? 0).toFixed(1)}h
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Horas Semanais Disponíveis</p>
                <p className="font-bold">{consultorData.horas_semanais_disponiveis}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Carga Realizada (Total)</p>
                <p className="font-bold text-green-700">{(consultorData.carga_total_realizada ?? 0).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Carga Prevista</p>
                <p className="font-bold text-blue-700">{(consultorData.carga_total_prevista ?? 0).toFixed(1)}h</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Tarefas Vencidas</p>
                <p className="font-bold text-red-600">{consultorData.qtd_tarefas_vencidas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Tarefas Críticas</p>
                <p className="font-bold text-orange-600">{consultorData.qtd_tarefas_criticas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Saturação Total</p>
                <p className="font-bold text-lg text-red-700">{(consultorData.indice_saturacao ?? 0).toFixed(0)}%</p>
              </div>
            </div>
          </div>
            </>
          )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SaturacaoConsultorModal({ consultor, open, onOpenChange }) {
  if (!consultor) return null;

  const getStatusColor = (status) => {
    const cores = {
      critico: { text: 'text-red-800', badge: 'bg-red-600' },
      alto: { text: 'text-orange-800', badge: 'bg-orange-600' },
      medio: { text: 'text-yellow-800', badge: 'bg-yellow-600' },
      baixo: { text: 'text-green-800', badge: 'bg-green-600' }
    };
    return cores[status] || cores.baixo;
  };

  const cor = getStatusColor(consultor.status_gargalo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${cor.badge}`}></div>
            <DialogTitle>{consultor.consultor_nome}</DialogTitle>
            <Badge className={`${cor.badge} text-white`}>
              {(consultor.indice_saturacao ?? 0).toFixed(0)}%
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Barra de Progress */}
          <div>
            <p className="text-sm font-semibold mb-2">Saturação Total</p>
            <Progress 
              value={Math.min(consultor.indice_saturacao, 200)} 
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
          </div>

          {/* Detalhes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Horas Semanais Disponíveis</p>
                <p className="font-bold">{consultor.horas_semanais_disponiveis}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Carga Realizada (Total)</p>
                <p className="font-bold text-green-700">{(consultor.carga_total_realizada ?? 0).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Carga Prevista</p>
                <p className="font-bold text-blue-700">{(consultor.carga_total_prevista ?? 0).toFixed(1)}h</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Tarefas Vencidas</p>
                <p className="font-bold text-red-600">{consultor.qtd_tarefas_vencidas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Tarefas Críticas</p>
                <p className="font-bold text-orange-600">{consultor.qtd_tarefas_criticas}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Saturação Total</p>
                <p className="font-bold text-lg text-red-700">{(consultor.indice_saturacao ?? 0).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
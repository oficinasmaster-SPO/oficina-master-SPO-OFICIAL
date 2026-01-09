import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MassReportHistory() {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["batch-dispatch-history"],
    queryFn: async () => {
      try {
        const disparos = await base44.entities.BatchDispatch.list();
        return disparos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } catch (error) {
        toast.error("Erro ao carregar histórico");
        return [];
      }
    }
  });

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Carregando histórico...</div>;
  }

  if (historico.length === 0) {
    return <div className="text-center py-8 text-gray-500">Nenhum disparo registrado ainda</div>;
  }

  return (
    <div className="space-y-2">
      {historico.map((disparo) => (
        <div key={disparo.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-mono text-sm text-blue-600 font-semibold">{disparo.disparo_id}</p>
              <p className="text-sm font-medium">{disparo.grupo_nome}</p>
              <div className="grid grid-cols-3 gap-4 mt-2 text-xs text-gray-600">
                <span>📅 {disparo.data_agendada} - {disparo.hora_agendada}</span>
                <span>👥 {disparo.total_clientes} cliente(s)</span>
                <span>👤 {disparo.consultor_nome}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" title="Visualizar" className="h-8 w-8 p-0">
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" title="Baixar" className="h-8 w-8 p-0">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
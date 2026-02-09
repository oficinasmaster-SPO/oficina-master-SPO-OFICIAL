import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Download, BarChart3, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function HistoricoHeader({ 
  onNewRecord, 
  onRefresh, 
  isFetching,
  workshopId,
  filterMonth,
  onSyncSuccess
}) {
  const handleExport = () => {
    toast.info("Exportação em desenvolvimento...");
  };

  const handleSyncAll = async () => {
    try {
      toast.info("Sincronizando dados...");
      const response = await base44.functions.invoke('syncEmployeeRealized', {
        workshop_id: workshopId,
        month: filterMonth
      });
      
      if (response.data.success) {
        toast.success(`✅ ${response.data.employees_synced} colaboradores sincronizados!`);
        onSyncSuccess();
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast.error("Erro ao sincronizar dados");
    }
  };

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-8 h-8 text-blue-600" />
          Histórico da Produção Diária
        </h1>
        <p className="text-gray-600 mt-2">
          Acompanhe os resultados e desempenho da oficina e colaboradores
        </p>
      </div>
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={handleSyncAll}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sincronizar Tudo
        </Button>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Atualizando...' : 'Atualizar'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = createPageUrl("GraficosProducao")}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Gráficos
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
        <Button onClick={onNewRecord} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Registro Manual
        </Button>
      </div>
    </div>
  );
}
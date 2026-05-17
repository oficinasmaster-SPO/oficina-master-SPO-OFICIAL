import React from "react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import RelatorioAnualViewer from "@/components/relatorios/RelatorioAnualViewer";

export default function RelatoriosAnuais() {
  const { workshop } = useWorkshopContext();

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Relatórios Anuais</h1>
        <p className="text-gray-600 mt-1">DRE, DFC e Projeções Financeiras</p>
      </div>

      <RelatorioAnualViewer workshopId={workshop.id} />
    </div>
  );
}
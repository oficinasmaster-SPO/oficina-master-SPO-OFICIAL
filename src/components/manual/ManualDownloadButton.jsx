import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ManualPDFGenerator from "./ManualPDFGenerator";

export default function ManualDownloadButton({ workshopId, className = "" }) {
  const [generating, setGenerating] = useState(false);

  const { data: manualData, isLoading } = useQuery({
    queryKey: ['manual-data-download', workshopId],
    queryFn: async () => {
      if (!workshopId) return null;

      const allProcessos = await base44.entities.ProcessDocument.list();
      const processos = allProcessos.filter(p => p.is_template || p.workshop_id === workshopId);

      const allITs = await base44.entities.InstructionDocument.list();
      const instructionDocs = allITs.filter(it => it.is_official || it.workshop_id === workshopId);

      const [cultura, cargos, areas, workshop] = await Promise.all([
        base44.entities.MissionVisionValues.filter({ workshop_id: workshopId }),
        base44.entities.JobDescription.filter({ workshop_id: workshopId }),
        base44.entities.ProcessArea.list(),
        base44.entities.Workshop.get(workshopId)
      ]);

      return {
        cultura: cultura && cultura.length > 0 ? cultura[0] : null,
        processos: processos || [],
        instructionDocs: instructionDocs || [],
        cargos: cargos || [],
        areas: areas || [],
        workshop
      };
    },
    enabled: !!workshopId
  });

  const handleDownloadPDF = async () => {
    if (!manualData) {
      toast.error("Dados do manual não disponíveis");
      return;
    }

    setGenerating(true);
    try {
      await ManualPDFGenerator.generate(manualData);
      toast.success("Manual baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  const isDisabled = isLoading || generating;

  return (
    <Button
      onClick={handleDownloadPDF}
      disabled={isDisabled}
      className={`bg-blue-600 hover:bg-blue-700 ${className}`}
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Baixar Manual
        </>
      )}
    </Button>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function MAPExporter({ map, ritualsData }) {
  const [exporting, setExporting] = useState(false);

  const exportToJSON = () => {
    try {
      const exportData = {
        map: {
          id: map.id,
          code: map.code,
          title: map.title,
          description: map.description,
          category: map.category,
          revision: map.revision,
          operational_status: map.operational_status,
          content_json: map.content_json
        },
        ritualsLinked: ritualsData,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${map.code}_${map.title.replace(/\s/g, "_")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("MAP exportado em JSON!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar JSON");
    }
  };

  const exportToPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const content = map.content_json || {};
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text(map.title, 20, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Código: ${map.code} | Revisão: ${map.revision} | Status: ${map.operational_status}`, 20, yPos);
      yPos += 10;
      doc.text(`Exportado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, yPos);
      yPos += 15;

      // Description
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Descrição", 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const descLines = doc.splitTextToSize(map.description || "", 170);
      doc.text(descLines, 20, yPos);
      yPos += descLines.length * 5 + 10;

      // Objetivo
      if (content.objetivo) {
        if (yPos > 250) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Objetivo", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        const objLines = doc.splitTextToSize(content.objetivo, 170);
        doc.text(objLines, 20, yPos);
        yPos += objLines.length * 5 + 10;
      }

      // Atividades
      if (content.atividades && content.atividades.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Atividades", 20, yPos);
        yPos += 7;

        const atividadesData = content.atividades.map(a => [
          a.atividade || "",
          a.responsavel || "",
          a.ferramentas || ""
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Atividade", "Responsável", "Ferramentas"]],
          body: atividadesData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [147, 51, 234] }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Riscos
      if (content.matriz_riscos && content.matriz_riscos.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Matriz de Riscos", 20, yPos);
        yPos += 7;

        const riscosData = content.matriz_riscos.map(r => [
          r.identificacao || "",
          r.categoria || "",
          r.impacto || "",
          r.controle || ""
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Risco", "Categoria", "Impacto", "Controle"]],
          body: riscosData,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 38, 38] }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // Indicadores
      if (content.indicadores && content.indicadores.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Indicadores", 20, yPos);
        yPos += 7;

        const indicadoresData = content.indicadores.map(i => [
          i.indicador || "",
          i.meta || "",
          i.como_medir || ""
        ]);

        doc.autoTable({
          startY: yPos,
          head: [["Indicador", "Meta", "Como Medir"]],
          body: indicadoresData,
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] }
        });
      }

      doc.save(`${map.code}_${map.title.replace(/\s/g, "_")}.pdf`);
      toast.success("MAP exportado em PDF!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={exportToJSON}
        className="gap-2"
      >
        <FileJson className="w-4 h-4" />
        Exportar JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={exportToPDF}
        disabled={exporting}
        className="gap-2"
      >
        <FileText className="w-4 h-4" />
        {exporting ? "Exportando..." : "Exportar PDF"}
      </Button>
    </div>
  );
}
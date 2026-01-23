import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";

export default function DiagnosticPDFGenerator({ diagnostic, workshop, phaseDistribution, dominantPhase, owner, executiveSummary, actionPlan }) {
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // ===== CABEÇALHO =====
      pdf.setFillColor(37, 99, 235); // Blue-600
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont(undefined, 'bold');
      pdf.text('OFICINAS MASTER', margin, 15);
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text('Educação Empresarial', margin, 22);
      
      pdf.setFontSize(10);
      pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 15, { align: 'right' });

      yPos = 50;

      // ===== DADOS DA OFICINA =====
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('DADOS DA OFICINA', margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Oficina: ${workshop?.name || 'Não informado'}`, margin, yPos);
      yPos += 6;
      pdf.text(`CNPJ: ${workshop?.cnpj || 'Não informado'}`, margin, yPos);
      yPos += 6;
      pdf.text(`Endereço: ${workshop?.endereco_completo || `${workshop?.city || ''}, ${workshop?.state || ''}`}`, margin, yPos);
      yPos += 6;
      pdf.text(`Responsável: ${owner?.full_name || owner?.email || 'Não informado'}`, margin, yPos);
      yPos += 10;

      // Linha separadora
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // ===== RESULTADO DO DIAGNÓSTICO =====
      pdf.setFillColor(dominantPhase.chartColor || '#3b82f6');
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text(`FASE ${dominantPhase.phase} - ${dominantPhase.shortTitle.toUpperCase()}`, pageWidth / 2, yPos + 12, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`${dominantPhase.count} de ${diagnostic.answers.length} respostas (${dominantPhase.percent}%)`, pageWidth / 2, yPos + 22, { align: 'center' });
      
      yPos += 40;

      // ===== DESCRIÇÃO =====
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      const descLines = pdf.splitTextToSize(dominantPhase.description, pageWidth - 2 * margin);
      pdf.text(descLines, margin, yPos);
      yPos += descLines.length * 6 + 10;

      // ===== DISTRIBUIÇÃO POR FASE =====
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('DISTRIBUIÇÃO POR FASE', margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      phaseDistribution.forEach((phase) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(`Fase ${phase.phase} - ${phase.shortTitle}:`, margin, yPos);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${phase.count} respostas (${phase.percent}%)`, margin + 60, yPos);
        
        // Barra de progresso
        const barWidth = 80;
        const barHeight = 4;
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin + 100, yPos - 3, barWidth, barHeight, 'F');
        pdf.setFillColor(phase.chartColor || '#3b82f6');
        pdf.rect(margin + 100, yPos - 3, (barWidth * phase.percent) / 100, barHeight, 'F');
        
        yPos += 8;
      });

      yPos += 10;

      // ===== RESUMO EXECUTIVO DA IA =====
      if (executiveSummary) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(59, 130, 246); // Blue
        pdf.rect(margin, yPos - 3, pageWidth - 2 * margin, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.text('RESUMO EXECUTIVO - ANÁLISE DA IA', margin + 2, yPos + 3);
        yPos += 12;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const summaryLines = pdf.splitTextToSize(executiveSummary, pageWidth - 2 * margin);
        pdf.text(summaryLines, margin, yPos);
        yPos += summaryLines.length * 5 + 10;
      }

      // ===== PLANO DE AÇÃO =====
      if (actionPlan) {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(16, 185, 129); // Green
        pdf.rect(margin, yPos - 3, pageWidth - 2 * margin, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.text('PLANO DE AÇÃO PERSONALIZADO COM IA', margin + 2, yPos + 3);
        yPos += 12;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        if (actionPlan.plan_data?.summary) {
          const planLines = pdf.splitTextToSize(actionPlan.plan_data.summary, pageWidth - 2 * margin);
          pdf.text(planLines, margin, yPos);
          yPos += planLines.length * 5 + 8;
        }

        // Cronograma de Implementação
        if (actionPlan.plan_data?.implementation_schedule && actionPlan.plan_data.implementation_schedule.length > 0) {
          if (yPos > pageHeight - 80) {
            pdf.addPage();
            yPos = margin;
          }

          pdf.setFont(undefined, 'bold');
          pdf.text('Cronograma de Implementação:', margin, yPos);
          yPos += 6;
          pdf.setFont(undefined, 'normal');

          actionPlan.plan_data.implementation_schedule.slice(0, 5).forEach((activity, index) => {
            if (yPos > pageHeight - 30) {
              pdf.addPage();
              yPos = margin;
            }
            pdf.text(`${index + 1}. ${activity.activity}`, margin + 5, yPos);
            yPos += 5;
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`   Prazo: ${activity.deadline} | Responsável: ${activity.responsible}`, margin + 5, yPos);
            yPos += 6;
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
          });
          yPos += 5;
        }
      }

      // ===== O QUE ISSO SIGNIFICA =====
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.setFillColor(251, 191, 36); // Yellow
      pdf.rect(margin, yPos - 3, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.text('💡 O QUE ISSO SIGNIFICA PARA SUA OFICINA?', margin + 2, yPos + 3);
      yPos += 12;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      const meaningText = `Fase Principal: Sua oficina está predominantemente na Fase ${dominantPhase.phase} - ${dominantPhase.shortTitle}, o que significa que suas maiores necessidades e prioridades estão relacionadas a ${dominantPhase.shortTitle.toLowerCase()}.`;
      const meaningLines = pdf.splitTextToSize(meaningText, pageWidth - 2 * margin);
      pdf.text(meaningLines, margin, yPos);
      yPos += meaningLines.length * 5 + 8;

      // Características Secundárias
      const secondaryPhases = phaseDistribution.filter(p => p.percent >= 15 && p.phase !== dominantPhase.phase);
      if (secondaryPhases.length > 0) {
        pdf.setFont(undefined, 'bold');
        pdf.text('Características Secundárias:', margin, yPos);
        yPos += 6;
        pdf.setFont(undefined, 'normal');

        secondaryPhases.forEach(phase => {
          pdf.text(`• Fase ${phase.phase} - ${phase.shortTitle} (${phase.percent}% das respostas)`, margin + 5, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      // Dica
      pdf.setFillColor(254, 243, 199); // Yellow-100
      pdf.rect(margin, yPos, pageWidth - 2 * margin, 20, 'F');
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('💡 Dica:', margin + 3, yPos + 5);
      pdf.setFont(undefined, 'normal');
      const tipText = 'É normal que sua oficina apresente características de múltiplas fases. O plano de ação vai priorizar as necessidades da sua fase principal, mas também vai abordar aspectos das outras fases identificadas.';
      const tipLines = pdf.splitTextToSize(tipText, pageWidth - 2 * margin - 6);
      pdf.text(tipLines, margin + 3, yPos + 10);
      yPos += 25;

      // ===== CAPTURAR GRÁFICOS =====
      const chartsContainer = document.getElementById('charts-for-pdf');
      if (chartsContainer) {
        if (yPos > pageHeight - 120) {
          pdf.addPage();
          yPos = margin;
        }

        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('GRÁFICOS DE ANÁLISE', margin, yPos);
        yPos += 10;

        try {
          const canvas = await html2canvas(chartsContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yPos + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPos = margin;
          }

          pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch (error) {
          console.error('Erro ao capturar gráficos:', error);
        }
      }

      // ===== RODAPÉ EM TODAS AS PÁGINAS =====
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Oficinas Master - Diagnóstico de Fase', margin, pageHeight - 10);
      }

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setShowPreview(true);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagnostico-fase-${workshop?.name || 'oficina'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF baixado!");
    }
  };

  return (
    <>
      <Button
        onClick={generatePDF}
        disabled={generating}
        className="flex-1 py-6 bg-green-600 hover:bg-green-700"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5 mr-2" />
            Gerar PDF
          </>
        )}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar PDF - Diagnóstico de Fase</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {pdfBlob && (
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-[600px] border rounded"
                title="Preview PDF"
              />
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
              Fechar
            </Button>
            <Button onClick={handleDownload} className="flex-1 bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
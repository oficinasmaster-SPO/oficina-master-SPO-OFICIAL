import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import ITViewer from "./ITViewer";
import jsPDF from "jspdf";

export default function ITViewerModal({ open, onClose, it, workshop }) {
  const handleDownloadPDF = () => {
    if (!it) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(it.type === 'IT' ? 'INSTRUÇÃO DE TRABALHO' : 'FORMULÁRIO DE REGISTRO', margin, yPos);
      yPos += 10;

      // Metadata
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Código: ${it.code}`, margin, yPos);
      doc.text(`Versão: ${it.version || '1'}`, pageWidth - margin - 30, yPos);
      yPos += 6;
      doc.text(`Status: ${it.status || 'ativo'}`, margin, yPos);
      yPos += 10;

      // Title
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      const titleLines = doc.splitTextToSize(it.title, pageWidth - 2 * margin);
      doc.text(titleLines, margin, yPos);
      yPos += titleLines.length * 7 + 5;

      // Description
      if (it.description) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const descLines = doc.splitTextToSize(it.description, pageWidth - 2 * margin);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 5 + 8;
      }

      // Objetivo
      if (it.content?.objetivo || it.objective) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('1. Objetivo', margin, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const objLines = doc.splitTextToSize(it.content?.objetivo || it.objective, pageWidth - 2 * margin);
        doc.text(objLines, margin, yPos);
        yPos += objLines.length * 5 + 8;
      }

      // Campo de Aplicação
      if (it.content?.campo_aplicacao || it.scope) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('2. Campo de Aplicação', margin, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const scopeLines = doc.splitTextToSize(it.content?.campo_aplicacao || it.scope, pageWidth - 2 * margin);
        doc.text(scopeLines, margin, yPos);
        yPos += scopeLines.length * 5 + 8;
      }

      // Atividades
      if (it.content?.atividades && it.content.atividades.length > 0) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('5. Atividades e Responsabilidades', margin, yPos);
        yPos += 8;
        
        it.content.atividades.forEach((ativ, idx) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text(`${idx + 1}. ${ativ.atividade}`, margin, yPos);
          yPos += 5;
          doc.setFont(undefined, 'normal');
          doc.text(`Responsável: ${ativ.responsavel || 'A definir'}`, margin + 5, yPos);
          yPos += 5;
          if (ativ.ferramentas) {
            doc.text(`Ferramentas: ${ativ.ferramentas}`, margin + 5, yPos);
            yPos += 5;
          }
          yPos += 3;
        });
      }

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(
          `${it.type} ${it.code} - v${it.version || '1'} | Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      const fileName = `${it.code}_${it.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${it.version || '1'}.pdf`;
      doc.save(fileName);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  if (!it) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl font-bold">{it?.type || 'IT'}</span>
              <span className="text-gray-500">|</span>
              <span className="text-lg">{it?.title}</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownloadPDF}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <ITViewer it={it} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
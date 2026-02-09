import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { generateAtaPDF } from "../AtasPDFGenerator";

export default function AtaPDFViewer({ open, onOpenChange, ata, workshop }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    try {
      setIsGenerating(true);
      const doc = generateAtaPDF(ata, workshop);
      const fileName = `ATA_${ata.id || 'disparo'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!ata) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Visualizar ATA - {ata.workshop_name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 p-4">
            <div className="bg-white p-8 mx-auto max-w-2xl shadow-sm">
              {/* Mini Preview - Similar ao PDF */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">GESTÃO DE PROCESSOS</h1>
                <h2 className="text-lg text-gray-600">AT - Ata de Atendimento</h2>
              </div>

              <div className="text-sm space-y-1 mb-8 pb-8 border-b">
                <p><strong>ID:</strong> {ata.id}</p>
                <p><strong>Grupo:</strong> {ata.workshop_name}</p>
                <p><strong>Data:</strong> {ata.data_agendada}</p>
                <p><strong>Hora:</strong> {ata.hora_agendada}</p>
                <p><strong>Tipo:</strong> {ata.tipo_atendimento?.replace(/_/g, " ")}</p>
              </div>

              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="font-bold mb-2">PAUTAS</h3>
                  <p className="text-gray-700">{ata.pauta || "Não informado"}</p>
                </div>

                <div>
                  <h3 className="font-bold mb-2">OBJETIVOS DO ATENDIMENTO</h3>
                  <p className="text-gray-700">{ata.objetivos || "Não informado"}</p>
                </div>

                <div>
                  <h3 className="font-bold mb-2">OBSERVAÇÕES</h3>
                  <p className="text-gray-700">{ata.observacoes || "Não informado"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fechar
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? "Gerando..." : "Baixar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
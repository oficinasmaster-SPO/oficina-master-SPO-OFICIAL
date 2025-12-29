import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Printer, FileText, Download } from "lucide-react";

export default function PrintOptionsDialog({ open, onClose, onPrint }) {
  const [options, setOptions] = React.useState({
    includeMap: true,
    includeIts: true,
    includeVersionHistory: false,
    includeMetadata: true
  });

  const handlePrint = () => {
    onPrint(options);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Opções de Impressão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="includeMap" 
              checked={options.includeMap}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMap: checked }))}
            />
            <Label htmlFor="includeMap" className="font-medium cursor-pointer">
              Incluir Conteúdo do MAP
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox 
              id="includeIts" 
              checked={options.includeIts}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeIts: checked }))}
            />
            <Label htmlFor="includeIts" className="font-medium cursor-pointer">
              Incluir ITs/FRs Vinculadas
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox 
              id="includeVersionHistory" 
              checked={options.includeVersionHistory}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeVersionHistory: checked }))}
            />
            <Label htmlFor="includeVersionHistory" className="font-medium cursor-pointer">
              Incluir Histórico de Versões
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox 
              id="includeMetadata" 
              checked={options.includeMetadata}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMetadata: checked }))}
            />
            <Label htmlFor="includeMetadata" className="font-medium cursor-pointer">
              Incluir Metadados (Status, Responsáveis)
            </Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <p className="text-sm text-blue-900">
              <strong>Dica:</strong> Para melhor resultado, use "Salvar como PDF" na janela de impressão.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={!options.includeMap && !options.includeIts}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
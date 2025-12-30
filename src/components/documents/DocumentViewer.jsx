import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

/**
 * Visualizador inline de documentos (PDFs e imagens)
 */
export default function DocumentViewer({ document, onClose, onDownload }) {
  if (!document) return null;

  const isPDF = document.file_url?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_url || '');

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{document.title}</DialogTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onDownload?.(document)}
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden rounded-lg border bg-slate-50">
          {isPDF && (
            <iframe
              src={document.file_url}
              className="w-full h-full"
              title={document.title}
            />
          )}
          
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={document.file_url} 
                alt={document.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          
          {!isPDF && !isImage && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>Visualização não disponível para este formato</p>
              <Button 
                className="mt-4"
                onClick={() => window.open(document.file_url, '_blank')}
              >
                Abrir em nova aba
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
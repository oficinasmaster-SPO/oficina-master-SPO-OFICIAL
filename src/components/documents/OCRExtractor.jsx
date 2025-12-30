import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

/**
 * Extração de texto via OCR usando IA
 */
export default function OCRExtractor({ document, onClose }) {
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extraia todo o texto deste documento PDF ou imagem. 
                 Retorne apenas o texto extraído, sem comentários adicionais.
                 Mantenha a formatação e estrutura original quando possível.`,
        file_urls: [document.file_url]
      });

      setExtractedText(result);
      toast.success("Texto extraído com sucesso!");
    } catch (error) {
      toast.error("Erro ao extrair texto: " + error.message);
      console.error(error);
    } finally {
      setExtracting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    toast.success("Texto copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Extração de Texto (OCR): {document?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!extractedText && !extracting && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">
                  Clique para extrair o texto deste documento usando IA
                </p>
                <Button onClick={handleExtract}>
                  Extrair Texto
                </Button>
              </CardContent>
            </Card>
          )}

          {extracting && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-gray-600">
                  Extraindo texto... Isso pode levar alguns segundos.
                </p>
              </CardContent>
            </Card>
          )}

          {extractedText && (
            <div className="flex-1 overflow-hidden flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {extractedText.length} caracteres extraídos
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Texto
                    </>
                  )}
                </Button>
              </div>

              <Card className="flex-1 overflow-auto">
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {extractedText}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {extractedText && (
            <Button variant="outline" onClick={handleExtract}>
              Extrair Novamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
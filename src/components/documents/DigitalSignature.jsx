import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eraser, Download, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Componente de assinatura digital com canvas
 */
export default function DigitalSignature({ document, onClose, onSign }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSigning, setIsSigning] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSign = async () => {
    if (isEmpty) {
      toast.error("Por favor, faça sua assinatura");
      return;
    }

    setIsSigning(true);
    try {
      const canvas = canvasRef.current;
      const signatureDataUrl = canvas.toDataURL('image/png');
      
      await onSign(signatureDataUrl);
      toast.success("Documento assinado com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao assinar documento");
      console.error(error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={!!document} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assinar Digitalmente: {document?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="bg-white border border-gray-300 rounded cursor-crosshair w-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Assine no campo acima usando o mouse
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              disabled={isEmpty}
            >
              <Eraser className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSign} disabled={isEmpty || isSigning}>
            <Check className="w-4 h-4 mr-2" />
            {isSigning ? "Assinando..." : "Confirmar Assinatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
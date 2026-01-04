import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, X, Edit3 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Card } from "@/components/ui/card";

export default function EmployeeAcknowledgmentModal({ 
  open, 
  onClose, 
  warning,
  onAcknowledge,
  onRefuse
}) {
  const [signatureMode, setSignatureMode] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const signatureRef = useRef(null);

  const handleSimpleAck = () => {
    onAcknowledge(null);
  };

  const handleSignatureAck = async () => {
    if (signatureRef.current.isEmpty()) {
      alert("Por favor, assine antes de confirmar");
      return;
    }
    
    const dataUrl = signatureRef.current.toDataURL();
    onAcknowledge(dataUrl);
  };

  const handleRefuse = () => {
    if (!witnessName.trim()) {
      alert("Informe o nome da testemunha");
      return;
    }
    onRefuse(witnessName);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-orange-700 flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Ciência de Advertência
          </DialogTitle>
        </DialogHeader>

        {warning && (
          <div className="space-y-4 py-2">
            <Card className="p-4 bg-orange-50 border-orange-200">
              <h4 className="font-bold text-orange-900 mb-2">Advertência #{warning.warning_number}</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Motivo:</strong> {warning.reason}</p>
                <p><strong>Data do Ocorrido:</strong> {new Date(warning.occurrence_date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Local:</strong> {warning.occurrence_location}</p>
                <p><strong>Gravidade:</strong> <span className={
                  warning.severity === 'leve' ? 'text-yellow-700' :
                  warning.severity === 'grave' ? 'text-orange-700' :
                  'text-red-700'
                }>{warning.severity.toUpperCase()}</span></p>
              </div>
            </Card>

            <div className="bg-gray-50 p-4 rounded border">
              <h5 className="font-semibold text-gray-900 mb-2">Descrição do Ocorrido:</h5>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{warning.description}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h5 className="font-semibold text-blue-900 mb-2">Orientação de Correção:</h5>
              <p className="text-sm text-blue-800">{warning.corrective_guidance}</p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Dar Ciência da Advertência:</h4>
              
              <div className="flex gap-3">
                <Button
                  variant={!signatureMode ? "default" : "outline"}
                  onClick={() => setSignatureMode(false)}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Leitura (Simples)
                </Button>
                <Button
                  variant={signatureMode ? "default" : "outline"}
                  onClick={() => setSignatureMode(true)}
                  className="flex-1"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Assinar Digitalmente
                </Button>
              </div>
            </div>

            {signatureMode && (
              <Card className="p-4">
                <Label className="mb-2 block">Assine com o dedo ou mouse:</Label>
                <div className="border-2 border-dashed border-gray-300 rounded bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 500,
                      height: 200,
                      className: "signature-canvas"
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signatureRef.current?.clear()}
                  className="mt-2"
                >
                  Limpar Assinatura
                </Button>
              </Card>
            )}

            <div className="border-t pt-4 bg-red-50 p-4 rounded">
              <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <X className="w-4 h-4" />
                Recusa de Assinatura
              </h5>
              <p className="text-xs text-red-700 mb-3">
                Caso o colaborador se recuse a assinar, registre o nome da testemunha:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome completo da testemunha"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="bg-white"
                />
                <Button
                  variant="destructive"
                  onClick={handleRefuse}
                  disabled={!witnessName.trim()}
                >
                  Registrar Recusa
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {!signatureMode ? (
            <Button onClick={handleSimpleAck} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar Ciência
            </Button>
          ) : (
            <Button onClick={handleSignatureAck} className="bg-blue-600 hover:bg-blue-700">
              <Edit3 className="w-4 h-4 mr-2" />
              Salvar Assinatura
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
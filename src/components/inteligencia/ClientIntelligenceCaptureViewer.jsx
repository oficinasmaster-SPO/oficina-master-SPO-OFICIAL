import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientIntelligenceCaptureViewer({ open, onOpenChange, item }) {
  if (!item) return null;

  const gravityColors = {
    baixa: "bg-blue-100 text-blue-900",
    media: "bg-yellow-100 text-yellow-900",
    alta: "bg-orange-100 text-orange-900",
    critica: "bg-red-100 text-red-900",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            {item.area}
          </DialogTitle>
          <DialogDescription>
            Informações capturadas durante o atendimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo */}
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">CLASSIFICAÇÃO</p>
            <div className="flex items-center gap-2">
              <span className="text-lg">{item.typeIcon}</span>
              <span className="text-sm font-bold text-blue-900">{item.type}</span>
            </div>
          </div>

          {/* Problema Específico */}
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">PROBLEMA ESPECÍFICO</p>
            <p className="text-sm text-gray-800 font-medium">{item.subcategory}</p>
          </div>

          {/* Gravidade */}
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">NÍVEL DE GRAVIDADE</p>
            <Badge className={`${gravityColors[item.gravity] || gravityColors.media} text-sm font-bold`}>
              {item.gravityLabel}
            </Badge>
          </div>

          {/* Status */}
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">STATUS</p>
            <Badge variant="outline" className="text-sm">
              Ativo
            </Badge>
          </div>

          {/* Data de Captura */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700">
            <p className="font-semibold">Capturada durante o atendimento</p>
            <p className="text-gray-600 mt-1">Será incluída no PDF da ATA</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
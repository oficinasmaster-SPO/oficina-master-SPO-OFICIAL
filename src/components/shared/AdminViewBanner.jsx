import React from "react";
import { AlertCircle, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminViewBanner({ workshopName, onClose }) {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 mb-6 rounded-lg shadow-lg border-2 border-orange-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg">Modo Admin: Visualizando Backoffice do Cliente</p>
            <p className="text-sm text-orange-100">
              Você está visualizando os dados de: <span className="font-semibold">{workshopName || 'Cliente'}</span>
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              navigate(createPageUrl("Usuarios"));
            }
          }}
          variant="ghost"
          className="text-white hover:bg-white/20"
          size="sm"
        >
          <X className="w-5 h-5 mr-2" />
          Sair do Modo Admin
        </Button>
      </div>
    </div>
  );
}
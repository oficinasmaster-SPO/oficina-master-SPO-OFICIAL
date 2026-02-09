import React from "react";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UnauthorizedAccess({ module = "esta área" }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar <strong>{module}</strong>.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com seu supervisor ou administrador para solicitar acesso.
          </p>
        </div>

        <Button
          onClick={() => navigate(createPageUrl("Home"))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>
    </div>
  );
}
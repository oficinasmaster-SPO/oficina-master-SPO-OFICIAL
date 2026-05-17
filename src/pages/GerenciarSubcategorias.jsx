import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import GerenciarSubcategoriasComponent from "@/components/dre/GerenciarSubcategorias";
import { AlertCircle } from "lucide-react";

export default function GerenciarSubcategorias() {
  const { user } = useAuth();
  const { workshop } = useWorkshopContext();

  // Verificar permissões
  const canAccess = user?.role === "admin" || user?.data?.workshop_id === workshop?.id;

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas administradores ou owners podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Subcategorias DRE</h1>
        <p className="text-gray-600 mt-1">
          Configure as subcategorias financeiras da sua oficina
        </p>
      </div>

      <GerenciarSubcategoriasComponent workshopId={workshop?.id} />
    </div>
  );
}
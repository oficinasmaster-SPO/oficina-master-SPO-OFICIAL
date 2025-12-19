import React from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Componente para proteger páginas por permissão
 * Uso: <PermissionGuard permission="gerenciar_roles">...</PermissionGuard>
 */
export default function PermissionGuard({ children, permission, action, redirectTo = "Home" }) {
  const { hasPermission, canPerform, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const hasAccess = permission ? hasPermission(permission) : (action ? canPerform(action) : true);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 text-center mb-6">
          Você não tem permissão para acessar esta funcionalidade.
        </p>
        <Button onClick={() => navigate(createPageUrl(redirectTo))}>
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
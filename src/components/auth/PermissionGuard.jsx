import React from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import UnauthorizedAccess from "./UnauthorizedAccess";
import { Loader2 } from "lucide-react";

export default function PermissionGuard({ 
  children, 
  module, 
  action = "view",
  fallback = null 
}) {
  const user = React.useMemo(() => {
    try {
      // Simula busca do user - em produção viria do contexto
      return window.__currentUser || null;
    } catch {
      return null;
    }
  }, []);

  const { hasPermission, isLoading, isAdmin } = usePermissions(user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Admin sempre tem acesso
  if (isAdmin) {
    return <>{children}</>;
  }

  // Verifica permissão
  if (!hasPermission(module, action)) {
    return fallback || <UnauthorizedAccess module={module} />;
  }

  return <>{children}</>;
}
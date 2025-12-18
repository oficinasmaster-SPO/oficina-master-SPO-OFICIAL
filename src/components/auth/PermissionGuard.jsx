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
  // Busca user do contexto global ou estado
  const [user, setUser] = React.useState(null);
  
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
    };
    loadUser();
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
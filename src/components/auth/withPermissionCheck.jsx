import React from "react";
import { usePermissions } from "@/components/hooks/usePermissions";

/**
 * HOC para proteger componentes com verificação de permissão
 * Uso: export default withPermissionCheck(MeuComponente, 'gerenciar_roles');
 */
export function withPermissionCheck(Component, requiredPermission, requiredAction) {
  return function ProtectedComponent(props) {
    const { hasPermission, canPerform, loading } = usePermissions();

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      );
    }

    const hasAccess = requiredPermission 
      ? hasPermission(requiredPermission) 
      : (requiredAction ? canPerform(requiredAction) : true);

    if (!hasAccess) {
      return null; // Não renderiza o componente
    }

    return <Component {...props} />;
  };
}

/**
 * Componente para renderização condicional baseada em permissão
 * Uso: <IfHasPermission permission="gerenciar_roles">...</IfHasPermission>
 */
export function IfHasPermission({ children, permission, action }) {
  const { hasPermission, canPerform, loading } = usePermissions();

  if (loading) return null;

  const hasAccess = permission 
    ? hasPermission(permission) 
    : (action ? canPerform(action) : true);

  return hasAccess ? <>{children}</> : null;
}
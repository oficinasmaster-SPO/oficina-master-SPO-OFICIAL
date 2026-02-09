import React from "react";
import { PermissionGuard } from "./PermissionGuard";

/**
 * HOC para proteger componentes com verificação de permissões granulares
 * @param {React.Component} Component - Componente a ser protegido
 * @param {string} resource - ID do recurso
 * @param {string} action - Ação necessária
 * @param {object} options - Opções adicionais (fallback, hideOnDenied)
 */
export function withPermissionCheck(Component, resource, action, options = {}) {
  return function ProtectedComponent(props) {
    return (
      <PermissionGuard 
        resource={resource} 
        action={action}
        fallback={options.fallback}
        hideOnDenied={options.hideOnDenied}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
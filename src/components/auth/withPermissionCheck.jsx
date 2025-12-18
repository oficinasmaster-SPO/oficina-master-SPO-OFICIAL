import React from "react";
import PermissionGuard from "./PermissionGuard";

/**
 * HOC para proteger páginas inteiras com verificação de permissão
 * Uso: export default withPermissionCheck(MyPage, 'resultados', 'view')
 */
export function withPermissionCheck(Component, module, action = 'view') {
  return function ProtectedComponent(props) {
    return (
      <PermissionGuard module={module} action={action}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
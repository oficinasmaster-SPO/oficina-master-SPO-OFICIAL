/**
 * @deprecated Use `usePermissions` from @/components/hooks/usePermissions instead.
 * Este hook verifica apenas job_role e ignora UserProfile, CustomRole e permissões granulares.
 * Mantido apenas para retrocompatibilidade — não usar em código novo.
 */
import { usePermissions } from "@/components/hooks/usePermissions";
import { getUserJobRole } from "@/utils/userUtils";

export function useAccessControl(allowedRoles = []) {
  const { user, hasPermission } = usePermissions();

  const hasAccess = () => {
    if (!user) return false;
    // Admin e internos têm acesso total (consistente com RBAC)
    if (user.role === 'admin' || user.user_type === 'internal') return true;
    if (allowedRoles.length === 0) return true;

    const userJobRole = getUserJobRole(user);
    return allowedRoles.includes(userJobRole);
  };

  return { hasAccess: hasAccess(), user };
}
import { useAuth } from "@/lib/AuthContext";
import { getUserJobRole } from "@/utils/userUtils";

export function useAccessControl(allowedRoles = []) {
  const { user } = useAuth();
  
  const hasAccess = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (allowedRoles.length === 0) return true;
    
    const userJobRole = getUserJobRole(user);
    return allowedRoles.includes(userJobRole);
  };
  
  return { hasAccess: hasAccess(), user };
}
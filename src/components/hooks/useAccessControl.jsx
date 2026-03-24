import { useAuth } from "@/lib/AuthContext";

export function useAccessControl(allowedRoles = []) {
  const { user } = useAuth();
  
  const hasAccess = () => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (allowedRoles.length === 0) return true;
    
    const userJobRole = user.data?.job_role || user.job_role;
    return allowedRoles.includes(userJobRole);
  };
  
  return { hasAccess: hasAccess(), user };
}
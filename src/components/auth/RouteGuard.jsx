import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { canAccessRoute, routePermissionMap } from "@/components/lib/menuVisibilityGate";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * RouteGuard - Protege rotas baseado no sistema RBAC
 * 
 * Uso:
 * <RouteGuard pageName="GestaoRBAC">
 *   <ComponenteProtegido />
 * </RouteGuard>
 */
export default function RouteGuard({ pageName, children, fallbackPage = "Home" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAccess();
  }, [pageName, location.pathname]);

  const checkAccess = async () => {
    try {
      // Verificar se é página pública
      const routeConfig = routePermissionMap[pageName];
      if (routeConfig?.type === "public") {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Carregar usuário
      const authenticated = await base44.auth.isAuthenticated();
      if (!authenticated) {
        toast.error("Você precisa estar autenticado para acessar esta página");
        navigate(createPageUrl(fallbackPage));
        setIsChecking(false);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Carregar UserProfile
      let userProfile = null;
      try {
        const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
        if (employees && employees.length > 0) {
          const employee = employees[0];
          
          if (employee.profile_id) {
            const profiles = await base44.entities.UserProfile.filter({ id: employee.profile_id });
            if (profiles && profiles.length > 0) {
              userProfile = profiles[0];
            }
          }
        }
      } catch (error) {
        console.error("[RouteGuard] Erro ao carregar perfil:", error);
      }

      setProfile(userProfile);

      // Verificar acesso
      const access = canAccessRoute(pageName, currentUser, userProfile);
      
      if (!access) {
        console.warn(`[RouteGuard] Acesso negado para ${pageName}`);
        toast.error("Você não tem permissão para acessar esta página");
        navigate(createPageUrl(fallbackPage), { replace: true });
        setIsChecking(false);
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error("[RouteGuard] Erro ao verificar acesso:", error);
      toast.error("Erro ao verificar permissões");
      navigate(createPageUrl(fallbackPage));
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
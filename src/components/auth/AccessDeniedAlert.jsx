import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * Componente para exibir alerta e registrar tentativas de acesso negado
 */
export default function AccessDeniedAlert({ pageName, requiredPermission, children }) {
  const [user, setUser] = React.useState(null);

  useEffect(() => {
    const logAccessDenied = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Criar log de acesso negado
        await base44.entities.UserActivityLog.create({
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          page_name: pageName,
          access_granted: false,
          denial_reason: requiredPermission 
            ? `Permissão necessária: ${requiredPermission}` 
            : "Sem permissão de acesso",
          ip_address: window.location.hostname,
          metadata: {
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });

        // Criar notificação para admins internos
        const admins = await base44.entities.Employee.filter({ 
          is_internal: true 
        });

        for (const admin of admins) {
          if (admin.user_id) {
            await base44.entities.Notification.create({
              user_id: admin.user_id,
              type: 'config_preferencias',
              title: '⚠️ Tentativa de Acesso Negado',
              message: `${currentUser.full_name || currentUser.email} tentou acessar "${pageName}" sem permissão.`,
              metadata: {
                blocked_user_email: currentUser.email,
                page: pageName,
                required_permission: requiredPermission
              }
            });
          }
        }

        // Toast para o usuário
        toast.error("Acesso Negado", {
          description: `Você não tem permissão para acessar esta página. Entre em contato com o administrador.`
        });
      } catch (error) {
        console.error("Erro ao registrar acesso negado:", error);
      }
    };

    logAccessDenied();
  }, [pageName, requiredPermission]);

  return (
    <div className="max-w-2xl mx-auto mt-20">
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="text-base">
          <strong>Acesso Negado:</strong> Você não possui as permissões necessárias para acessar esta página.
          {requiredPermission && (
            <p className="mt-2 text-sm">
              Permissão necessária: <code className="bg-red-900/20 px-2 py-1 rounded">{requiredPermission}</code>
            </p>
          )}
          <p className="mt-2 text-sm">
            Entre em contato com o administrador do sistema para solicitar acesso.
          </p>
        </AlertDescription>
      </Alert>
      {children}
    </div>
  );
}
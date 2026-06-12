import React from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/components/hooks/usePermissions";
import { createPageUrl } from "@/utils";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WheelLoader from "@/components/ui/WheelLoader";

/**
 * RouteGuard — controle de acesso por rota.
 *
 * Substitui PageAccessControl com lógica consolidada:
 *   1. adminOnly        → user.role === 'admin'
 *   2. requiredPerm     → hasPermission(perm) via RBAC granular
 *   3. internos         → user_type === 'internal' bypassa qualquer restrição
 *
 * Usado internamente pelo LayoutWrapper — não instanciar diretamente nas páginas.
 */
export default function RouteGuard({ children, pageName, adminOnly = false }) {
  const { user, hasPermission, canAccessPage, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <WheelLoader size="lg" />
      </div>
    );
  }

  if (!user) return null;

  // A validação de Admin / Interno é agora tratada de forma unificada dentro de canAccessPage.
  // Evitamos a duplicação de "bypass" no RouteGuard.

  if (adminOnly) {
    // Para rotas admin-only estritas, validamos o perfil de acesso global
    const isInternal = user.user_type === 'internal' || user.consulting_firm_id === '69bab264d7c3fe5d367c3959';
    if (user.role !== 'admin' && !isInternal) {
      return <AccessDenied navigate={navigate} reason="apenas_admin" />;
    }
  }

  // Verificação granular RBAC centralizada (pagePermissions + UserProfile + CustomRole + Bypasses Globais)
  if (pageName && !canAccessPage(pageName)) {
    return <AccessDenied navigate={navigate} reason="sem_permissao" />;
  }

  return <>{children}</>;
}

function AccessDenied({ navigate, reason }) {
  const messages = {
    apenas_admin: {
      title: "Acesso Exclusivo Administrador",
      message: "Esta funcionalidade está disponível apenas para administradores do sistema.",
    },
    sem_permissao: {
      title: "Sem Permissão",
      message: "Você não possui as permissões necessárias para acessar esta página.",
    },
  };

  const { title, message } = messages[reason] || messages.sem_permissao;

  return (
    <div className="flex flex-col items-center justify-center h-96 p-6">
      <div className="bg-red-100 p-6 rounded-full w-24 h-24 flex items-center justify-center mb-6">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 text-center mb-6 max-w-md">{message}</p>
      <p className="text-sm text-gray-500 mb-6">
        Entre em contato com o administrador se precisar de acesso.
      </p>
      <Button onClick={() => navigate(createPageUrl("Home"))}>
        Voltar ao Início
      </Button>
    </div>
  );
}
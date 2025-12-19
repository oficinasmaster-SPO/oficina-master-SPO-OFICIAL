import React from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Wrapper para controle de acesso de páginas inteiras
 * Uso: Envolver o conteúdo da página para validar acesso
 */
export default function PageAccessControl({ 
  children, 
  requiredPermissions = [], 
  requiredJobRoles = [],
  blockedJobRoles = [],
  adminOnly = false 
}) {
  const { user, hasPermission, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Verificar se é admin only
  if (adminOnly && user.role !== 'admin') {
    return <AccessDenied navigate={navigate} reason="apenas_admin" />;
  }

  // Verificar job_roles bloqueadas
  if (blockedJobRoles.length > 0 && blockedJobRoles.includes(user.job_role)) {
    return <AccessDenied navigate={navigate} reason="perfil_bloqueado" jobRole={user.job_role} />;
  }

  // Verificar job_roles necessárias
  if (requiredJobRoles.length > 0 && !requiredJobRoles.includes(user.job_role) && user.role !== 'admin') {
    return <AccessDenied navigate={navigate} reason="perfil_insuficiente" />;
  }

  // Verificar permissões específicas
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(perm => hasPermission(perm));
    if (!hasAllPermissions && user.role !== 'admin') {
      return <AccessDenied navigate={navigate} reason="sem_permissao" />;
    }
  }

  return <>{children}</>;
}

function AccessDenied({ navigate, reason, jobRole }) {
  const messages = {
    'apenas_admin': {
      title: 'Acesso Exclusivo Administrador',
      message: 'Esta funcionalidade está disponível apenas para administradores do sistema.',
    },
    'perfil_bloqueado': {
      title: 'Acesso Restrito',
      message: `Como ${jobRole || 'seu perfil'}, você não tem permissão para acessar esta página.`,
    },
    'perfil_insuficiente': {
      title: 'Permissão Insuficiente',
      message: 'Seu perfil não possui acesso a esta funcionalidade.',
    },
    'sem_permissao': {
      title: 'Sem Permissão',
      message: 'Você não possui as permissões necessárias para acessar esta página.',
    }
  };

  const { title, message } = messages[reason] || messages['sem_permissao'];

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
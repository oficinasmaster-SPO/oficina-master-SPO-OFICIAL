import React, { useState, useEffect } from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { Loader2, Lock } from "lucide-react";

/**
 * Componente para proteger recursos com permissões granulares
 * @param {string} resource - ID do recurso (ex: 'employees', 'workshops')
 * @param {string} action - Ação necessária (ex: 'create', 'read', 'update', 'delete')
 * @param {React.ReactNode} children - Conteúdo a ser renderizado se tiver permissão
 * @param {React.ReactNode} fallback - Conteúdo alternativo se não tiver permissão
 * @param {boolean} hideOnDenied - Se true, não renderiza nada quando negado
 */
export function PermissionGuard({ 
  resource, 
  action, 
  children, 
  fallback = null,
  hideOnDenied = false 
}) {
  const { user, hasGranularPermission, loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || loading) return;
      
      setChecking(true);
      try {
        const allowed = await hasGranularPermission(resource, action);
        setHasAccess(allowed);
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkPermission();
  }, [user, resource, action, loading]);

  if (loading || checking) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Verificando permissões...</span>
      </div>
    );
  }

  if (!hasAccess) {
    if (hideOnDenied) return null;
    
    return fallback || (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-gray-500">
        <Lock className="w-4 h-4" />
        <span className="text-sm">Você não tem permissão para esta ação.</span>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook para verificar permissão granular de forma assíncrona
 * @param {string} resource - ID do recurso
 * @param {string} action - Ação necessária
 * @returns {object} - { hasAccess, checking }
 */
export function useGranularPermission(resource, action) {
  const { user, hasGranularPermission, loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || loading) {
        setChecking(false);
        return;
      }
      
      setChecking(true);
      try {
        const allowed = await hasGranularPermission(resource, action);
        setHasAccess(allowed);
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkPermission();
  }, [user, resource, action, loading]);

  return { hasAccess, checking };
}
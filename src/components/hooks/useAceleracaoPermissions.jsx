import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook RBAC para /controleaceleracao.
 * Valida permissões no backend — frontend nunca é fonte de verdade.
 *
 * Retorna:
 *  - authorized: boolean
 *  - loading: boolean
 *  - error: string | null
 *  - effectiveRole: string | null
 *  - permissions: Record<string, boolean>
 *  - hasPermission(resource, action): boolean
 */
export default function useAceleracaoPermissions(userId) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["aceleracao-permissions", userId],
    queryFn: async () => {
      const res = await base44.functions.invoke("validateAceleracaoAccess", {});
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5min cache
    retry: 1,
  });

  const permissions = useMemo(() => data?.permissions || {}, [data]);

  const hasPermission = useCallback(
    (resource, action) => {
      const key = action ? `${resource}.${action}` : resource;
      return permissions[key] === true;
    },
    [permissions]
  );

  return {
    authorized: data?.authorized === true,
    loading: isLoading,
    error: error ? error.message : data?.reason || null,
    effectiveRole: data?.effectiveRole || null,
    permissions,
    hasPermission,
  };
}
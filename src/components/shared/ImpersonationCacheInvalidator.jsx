import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getImpersonationData } from './ImpersonationBanner';

/**
 * Invalida todo o cache de queries quando entra/sai de impersonação
 * Garante que dados do usuário impersonado sejam sempre frescos
 */
export default function ImpersonationCacheInvalidator() {
  const queryClient = useQueryClient();
  const lastImpersonationStateRef = useRef(null);

  useEffect(() => {
    const impersonationData = getImpersonationData();
    const isCurrentlyImpersonating = !!impersonationData;
    const wasImpersonating = lastImpersonationStateRef.current;

    // Se mudou estado de impersonação (entrou ou saiu), invalidar tudo
    if (isCurrentlyImpersonating !== wasImpersonating) {
      console.log('[ImpersonationCacheInvalidator] Estado de impersonação mudou. Invalidando cache...', {
        antes: wasImpersonating,
        agora: isCurrentlyImpersonating,
        usuarioAlvo: impersonationData?.target_user?.email || null
      });

      // Invalidar TODOS os queries para forçar refetch
      queryClient.invalidateQueries();

      lastImpersonationStateRef.current = isCurrentlyImpersonating;
    } else if (isCurrentlyImpersonating && wasImpersonating) {
      // Se continua impersonando, verificar se mudou o usuário alvo
      const newTargetId = impersonationData?.target_user?.id;
      const oldTargetId = lastImpersonationStateRef.current?.targetUserId;

      if (newTargetId && oldTargetId && newTargetId !== oldTargetId) {
        console.log('[ImpersonationCacheInvalidator] Usuário impersonado mudou. Invalidando cache...', {
          usuarioAnterior: oldTargetId,
          usuarioNovo: newTargetId
        });
        queryClient.invalidateQueries();
        lastImpersonationStateRef.current = { ...impersonationData, targetUserId: newTargetId };
      }
    }
  }, [queryClient]);

  return null; // Este componente apenas gerencia side effects
}
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { handleAuthExpired } from '@/lib/sessionManager';

// Backup em camada React Query: se algum erro 401 chegar pelas queries/mutations,
// dispara o logout centralizado (a trava em sessionManager impede duplicação).
function _is401(error) {
	return error?.response?.status === 401 || error?.status === 401 || error?.statusCode === 401;
}

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => { if (_is401(error)) handleAuthExpired('query-401'); },
	}),
	mutationCache: new MutationCache({
		onError: (error) => { if (_is401(error)) handleAuthExpired('mutation-401'); },
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// RAIZ-429: NUNCA retentar em 429 (rate limit / "App entity read traffic
			// volume limit exceeded"). Retentar um 429 só adiciona tráfego ao limite
			// agregado, piorando a cascata. Outros erros (rede/transient) retentam 1x.
			retry: (failureCount, error) => {
				const status = error?.status || error?.response?.status || error?.statusCode;
				if (status === 429) return false;
				return failureCount < 1;
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		},
		mutations: {
			retry: 0,
		},
	},
});

// Expondo a instância no window para permitir limpar o cache em mudanças de tenant (multi-filial)
// e para o sessionManager acessar sem importar este módulo (evita ciclo de módulos).
if (typeof window !== 'undefined') {
  window.__REACT_QUERY_CLIENT__ = queryClientInstance;
}
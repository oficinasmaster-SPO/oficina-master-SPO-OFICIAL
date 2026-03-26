import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		},
	},
});

// Expondo a instância no window para permitir limpar o cache em mudanças de tenant (multi-filial)
if (typeof window !== 'undefined') {
  window.__REACT_QUERY_CLIENT__ = queryClientInstance;
}
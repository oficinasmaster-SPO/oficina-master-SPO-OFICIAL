// Session Manager — fonte única de verdade para logout por expiração de sessão.
// Camada client HTTP (base44Client) e React Query (query-client) apenas DETECTAM
// o 401 e chamam handleAuthExpired(); toda a limpeza acontece aqui, uma única vez.

import { toast } from 'sonner';

const AUTH_EVENT = 'om-auth-expired';
const TOKEN_KEY = 'base44_access_token';

// Trava global: se 10 requisições 401 chegarem juntas, só executa o logout 1x.
let isLoggingOut = false;

/**
 * Erro padronizado para falhas de autenticação.
 * O client HTTP pode lançá-lo; o React Query global onError também o reconhece.
 */
export class AuthExpiredError extends Error {
  constructor(message = 'Sessão expirada') {
    super(message);
    this.name = 'AuthExpiredError';
    this.isAuthExpired = true;
  }
}

/**
 * Executa o logout completo e centralizado.
 * Idempotente via isLoggingOut — múltiplos 401 simultâneos não disparam N logouts.
 */
export function handleAuthExpired(reason = 'expired') {
  if (isLoggingOut) return;
  isLoggingOut = true;

  // 1. Toast amigável (curto, pois redirecionamos logo)
  try {
    toast.error('Sua sessão expirou. Faça login novamente para continuar.', { duration: 4000 });
  } catch { /* sonner pode não estar montado em ambientes isolados */ }

  // 2. Limpa o token
  try { localStorage.removeItem(TOKEN_KEY); } catch {}

  // 3. Sinaliza o AuthProvider para zerar user/authUser/isAuthenticated imediatamente
  try { window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { reason } })); } catch {}

  // 4. Cancela todas as queries em voo e limpa o cache do React Query
  const qc = (typeof window !== 'undefined' && window.__REACT_QUERY_CLIENT__) || null;
  if (qc) {
    qc.cancelQueries().catch(() => {});
    qc.clear();
  }

  // 5. Redireciona para o login com returnUrl (após delay mínimo para o toast renderizar)
  const returnUrl = (window.location.pathname || '/') + (window.location.search || '');
  setTimeout(async () => {
    try {
      // Import dinâmico evita ciclo de módulos com base44Client.
      const { base44 } = await import('@/api/base44Client');
      base44.auth.redirectToLogin(returnUrl);
    } catch {
      window.location.href = '/?returnUrl=' + encodeURIComponent(returnUrl);
    }
    // Libera a trava após redirect; se algo falhar, permite nova tentativa.
    setTimeout(() => { isLoggingOut = false; }, 4000);
  }, 700);
}

/**
 * Sincroniza logout entre abas: se outra aba remover o token, esta aba também desloga.
 * Deve ser chamado uma vez na inicialização do app.
 */
export function initCrossTabSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN_KEY && !e.newValue) {
      // Outra aba fez logout — replica aqui.
      handleAuthExpired('cross-tab');
    }
  });
}

export const AUTH_EXPIRED_EVENT = AUTH_EVENT;
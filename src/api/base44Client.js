import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { handleAuthExpired } from '@/lib/sessionManager';

// --- Request Queue and Deduplication for Concurrency Control ---
const originalFetch = window.fetch;

class RequestQueue {
    constructor(concurrency = 8) { // CON-02: aumentado de 5 para 8 — reduz batches de 3 para 2 no boot
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
        this.inFlight = new Map();
    }

    async fetch(url, options) {
        const method = options?.method || 'GET';
        
        // SESSION-FIX-002: deduplicação segura de GETs.
        // Guarda a Response clonada em arrayBuffer para que múltiplos
        // consumers recebam bodies intactos (antes, .clone() numa
        // Response já consumida lançava TypeError silencioso).
        if (method === 'GET') {
            const key = `${url}-${JSON.stringify(options?.headers || {})}`;
            if (this.inFlight.has(key)) {
                const cached = await this.inFlight.get(key);
                return new Response(cached.body, {
                    status: cached.status,
                    statusText: cached.statusText,
                    headers: cached.headers,
                });
            }
            
            const promise = this._enqueue(url, options).then(async (res) => {
                const buf = await res.arrayBuffer();
                return { body: buf, status: res.status, statusText: res.statusText, headers: res.headers };
            });
            this.inFlight.set(key, promise);
            promise.finally(() => this.inFlight.delete(key));
            const cached = await promise;
            return new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: cached.headers,
            });
        }
        
        return this._enqueue(url, options);
    }

    _enqueue(url, options) {
        return new Promise((resolve, reject) => {
            this.queue.push({ url, options, resolve, reject });
            this._next();
        });
    }

    _next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const { url, options, resolve, reject } = this.queue.shift();
        
        originalFetch(url, options)
            .then(async (res) => {
                // SESSION-FIX: detecta 401 (token expirado) e dispara logout centralizado.
                // Só trata respostas da API da Base44 — evita falsos positivos em outros hosts.
                if (res.status === 401) {
                    const urlStr = typeof url === 'string' ? url : (url?.url || '');
                    if (urlStr.includes(appParams.serverUrl) || urlStr.includes('/api/')) {
                        handleAuthExpired('expired');
                    }
                }
                // Intercept limit exceeded responses
                if (res.status === 403 || res.status === 429) {
                    try {
                        const clone = res.clone();
                        const data = await clone.json();
                        if (data?.error === 'limite_excedido' && data?.upgrade) {
                            window.dispatchEvent(new CustomEvent('PLAN_LIMIT_EXCEEDED', { detail: data }));
                        }
                    } catch (e) {
                        // ignore parsing errors
                    }
                }
                resolve(res);
            })
            .catch(reject)
            .finally(() => {
                this.running--;
                this._next();
            });
    }
}

const globalQueue = new RequestQueue(5);
window.fetch = (url, options) => globalQueue.fetch(url, options);
// ---------------------------------------------------------------

const { appId, serverUrl, functionsVersion } = appParams;

// ── TOKEN REATIVO (SESSION-FIX-001) ──────────────────────────────────────────
// O client precisa sempre usar o token mais recente do localStorage/URL.
// Antes, o client era criado UMA VEZ no boot com um token possivelmente
// ausente/expirado — causando 401 em cascata e perda de sessão.
// Agora: um Proxy delega toda propriedade a um client que é recriado
// automaticamente quando o token muda.
function resolveCurrentToken() {
  try {
    return new URLSearchParams(window.location.search).get('access_token')
      || localStorage.getItem('base44_access_token')
      || appParams.token
      || null;
  } catch { return appParams.token || null; }
}

let _cachedClient = null;
let _cachedToken = null;

function getActiveClient() {
  const token = resolveCurrentToken();
  if (!_cachedClient || token !== _cachedToken) {
    _cachedToken = token;
    _cachedClient = createClient({
      appId,
      serverUrl,
      token,
      functionsVersion,
      requiresAuth: true,
    });
  }
  return _cachedClient;
}

export const base44 = new Proxy({}, {
  get(_target, prop) {
    const client = getActiveClient();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});
// ── FIM TOKEN REATIVO ────────────────────────────────────────────────────────
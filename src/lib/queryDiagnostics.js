/**
 * queryDiagnostics — INSTRUMENTAÇÃO TEMPORÁRIA
 * --------------------------------------------------------------
 * Objetivo: mapear QUEM dispara a avalanche de leituras (429) no boot
 * da CentralFollowUp, em vez de tratar apenas os sintomas.
 *
 * Registra cada fetch do React Query:
 *  - queryKey (chave serializada)
 *  - timestamp do disparo
 *  - contagem acumulada por chave
 *  - stack trace de origem (capturado no momento do fetch)
 *
 * Exposição em window.__QUERY_DIAG__:
 *  - summary():        lista ordenada por nº de execuções
 *  - raw():            Map completo { key -> {count, firstSeen, lastSeen, stacks[]} }
 *  - reset():          zera os contadores
 *  - printTop(n):      console.table dos top-N
 *
 * Remover após a investigação concluir (ver nota no query-client.js).
 */

const enabled = import.meta.env?.DEV === true;

/** Map<keyString, { count, firstSeen, lastSeen, stacks: string[], sampleComponentHints: string[] }> */
const _counts = new Map();

/** Guarda o último fetchStatus visto por queryId p/ logar só no início do fetch. */
const _lastFetchStatus = new Map();

function _serializeKey(queryKey) {
  try {
    if (queryKey == null) return '<null>';
    if (typeof queryKey === 'string') return queryKey;
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

/**
 * Extrai pistas do componente responsável a partir do stack.
 * Procura por linhas /src/pages, /src/components ou /src/hooks.
 */
function _extractComponentHints(stack) {
  if (!stack) return [];
  const hints = new Set();
  const lines = stack.split('\n');
  for (const line of lines) {
    const m = line.match(/(\/src\/(?:pages|components|hooks|lib)\/[^\s)]+\.jsx?[^\s:]*:\d+:\d+)/);
    if (m) {
      const compact = m[1].replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '');
      hints.add(compact);
    }
  }
  return Array.from(hints).slice(0, 5);
}

export function installQueryDiagnostics(queryClient) {
  if (!enabled) return;

  const cache = queryClient.getQueryCache();

  cache.subscribe((event) => {
    if (!event || !event.query) return;
    const query = event.query;
    const keyStr = _serializeKey(query.queryKey);
    const qid = query.queryHash || keyStr;

    const prevStatus = _lastFetchStatus.get(qid);
    const nowFetching = query.state.fetchStatus === 'fetching';

    // Loga apenas na transição para 'fetching' (evita duplicar em updates intermediários).
    if (nowFetching && prevStatus !== 'fetching') {
      const now = new Date();
      const ts = now.toISOString();
      let entry = _counts.get(keyStr);
      if (!entry) {
        entry = { count: 0, firstSeen: ts, lastSeen: ts, stacks: [], componentHints: new Set() };
        _counts.set(keyStr, entry);
      }
      entry.count += 1;
      entry.lastSeen = ts;

      const stack = new Error().stack || '';
      entry.componentHints.add(..._extractComponentHints(stack));
      if (entry.stacks.length < 2) entry.stacks.push(stack);

      const hints = _extractComponentHints(stack);
      // eslint-disable-next-line no-console
      console.warn(
        `%c[QUERY-DIAG] fetch #${entry.count}`,
        'color:#eab308;font-weight:bold',
        { queryKey: query.queryKey, ts, componentHints: hints }
      );
    }

    _lastFetchStatus.set(qid, query.state.fetchStatus);
  });

  // Exposição para inspeção manual no console do navegador.
  if (typeof window !== 'undefined') {
    window.__QUERY_DIAG__ = {
      enabled: true,
      reset() {
        _counts.clear();
        _lastFetchStatus.clear();
        // eslint-disable-next-line no-console
        console.info('[QUERY-DIAG] contadores zerados');
      },
      raw() {
        return Array.from(_counts.entries()).map(([key, v]) => ({
          queryKey: key,
          count: v.count,
          firstSeen: v.firstSeen,
          lastSeen: v.lastSeen,
          componentHints: Array.from(v.componentHints),
        }));
      },
      summary() {
        return this.raw().sort((a, b) => b.count - a.count);
      },
      printTop(n = 20) {
        const top = this.summary().slice(0, n);
        // eslint-disable-next-line no-console
        console.table(top.map(r => ({
          'queryKey': r.queryKey.slice(0, 80),
          'execuções': r.count,
          'origem (hints)': r.componentHints.join(' | ').slice(0, 100),
        })));
        return top;
      },
    };
    // eslint-disable-next-line no-console
    console.info(
      '%c[QUERY-DIAG] Instrumentação ativa. Use window.__QUERY_DIAG__.printTop(20) para ver os maiores disparadores.',
      'color:#eab308'
    );
  }
}
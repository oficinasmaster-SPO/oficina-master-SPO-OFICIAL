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
 *  - raw():            detalhe completo { key -> {count, firstSeen, lastSeen, hints[]} }
 *  - reset():          zera os contadores
 *  - printTop(n):      console.groupCollapsed por chave (hints completos, não truncados)
 *
 * Remover após a investigação concluir (ver nota no query-client.js).
 */

const enabled = import.meta.env?.DEV === true;

/**
 * Map<keyString, { count, firstSeen, lastSeen, hints: string[], stacks: string[] }>
 * `hints` é um array ordenado (inserção) com dedup implícita via _pushUnique.
 */
const _counts = new Map();

/** Guarda o último fetchStatus visto por queryId p/ logar só na borda idle→fetching. */
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
 * Regex ancorada em `/src/` — captura `path:linha` de arquivos do projeto
 * e ignora linhas de node_modules (que podem conter "src/" em substrings)
 * e parâmetros de URL `?v=hash`.
 */
function _extractComponentHints(stack) {
  if (!stack) return [];
  const hints = new Set();
  const lines = stack.split('\n');
  const re = /\/(src\/(?:pages|components|hooks|lib)\/[^\s?)]+\.jsx?)[^:]*:(\d+)/;
  for (const line of lines) {
    const m = line.match(re);
    if (m) hints.add(`${m[1]}:${m[2]}`);
  }
  return Array.from(hints).slice(0, 5);
}

/** Adiciona `value` a `arr` apenas se ainda não existir — mantém ordem de inserção. */
function _pushUnique(arr, value) {
  if (value && !arr.includes(value)) {
    arr.push(value);
    return true;
  }
  return false;
}

export function installQueryDiagnostics(queryClient) {
  if (!enabled) return;

  const cache = queryClient.getQueryCache();

  cache.subscribe((event) => {
    if (!event || !event.query) return;
    const query = event.query;
    const keyStr = _serializeKey(query.queryKey);
    const qid = query.queryHash || keyStr;

    const nowFetching = query.state.fetchStatus === 'fetching';
    // Marca o status ANTES de processar — garante que apenas a borda
    // idle→fetching dispara o log, mesmo em reinvocações rápidas.
    const prevStatus = _lastFetchStatus.get(qid);
    _lastFetchStatus.set(qid, query.state.fetchStatus);

    if (nowFetching && prevStatus !== 'fetching') {
      const ts = new Date().toISOString();
      let entry = _counts.get(keyStr);
      if (!entry) {
        entry = { count: 0, firstSeen: ts, lastSeen: ts, hints: [], stacks: [] };
        _counts.set(keyStr, entry);
      }
      entry.count += 1;
      entry.lastSeen = ts;

      const stack = new Error().stack || '';
      const newHints = _extractComponentHints(stack);
      // CORREÇÃO: itera e adiciona um por vez (Set.add(...spread) só adicionava
      // o primeiro argumento). Mantém array com inserção na ordem + dedup.
      for (const h of newHints) {
        _pushUnique(entry.hints, h);
      }
      if (entry.stacks.length < 2) entry.stacks.push(stack);

      // eslint-disable-next-line no-console
      console.warn(
        `%c[QUERY-DIAG] fetch #${entry.count}`,
        'color:#eab308;font-weight:bold',
        { queryKey: query.queryKey, ts, componentHints: entry.hints }
      );
    }
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
          hints: v.hints,
        }));
      },
      summary() {
        return this.raw().sort((a, b) => b.count - a.count);
      },
      printTop(n = 20) {
        const top = this.summary().slice(0, n);
        // console.table trunca strings ~60 chars; usa groupCollapsed para mostrar
        // todos os hints por entrada, expandíveis com um clique.
        for (const r of top) {
          // eslint-disable-next-line no-console
          console.groupCollapsed(
            `%c[QUERY-DIAG] %c${r.count}x %c${r.queryKey.slice(0, 80)}`,
            'color:#eab308;font-weight:bold',
            'color:#f87171;font-weight:bold',
            'color:#9ca3af'
          );
          // eslint-disable-next-line no-console
          console.table([{ queryKey: r.queryKey, execuções: r.count }]);
          if (r.hints && r.hints.length) {
            // eslint-disable-next-line no-console
            console.log('componentHints (origem):', r.hints);
          } else {
            // eslint-disable-next-line no-console
            console.log('componentHints: (nenhum hint de /src/ capturado)');
          }
          // eslint-disable-next-line no-console
          console.groupEnd();
        }
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
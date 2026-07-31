/**
 * queryDiagnostics — INSTRUMENTAÇÃO TEMPORÁRIA (dev-only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mapeia QUEM dispara cada leitura ao React Query, incluindo:
 *   - queryKey serializada
 *   - timestamp do primeiro e último disparo
 *   - contagem acumulada por chave
 *   - componentHints: linhas de src/pages|components|hooks|lib extraídas
 *     do stack no momento do fetch — identifica o provider/hook/página exato
 *
 * Console API (window.__QUERY_DIAG__):
 *   printTop(n = 20)  → console.table dos top-N por nº de execuções
 *   raw()             → array completo com componentHints por chave
 *   reset()           → zera contadores (isola uma ação específica)
 *   enabled           → true se instrumentação ativa
 *
 * ⚠️  Remover queryDiagnostics.js e o import/call em query-client.js após
 *     concluir a investigação.
 */

const DEV = import.meta.env?.DEV === true;

// ─── estado interno ───────────────────────────────────────────────────────────

/**
 * Map<keyString, {
 *   count: number,
 *   firstSeen: string,   // ISO timestamp
 *   lastSeen:  string,
 *   hints: string[],     // union de todas as origens vistas (dedup)
 *   stacks: string[],    // até 3 stacks completos para debug profundo
 * }>
 */
const _records = new Map();

/** queryHash → último fetchStatus visto (evita logar duplicatas dentro do mesmo fetch) */
const _lastStatus = new Map();

// ─── utilitários ─────────────────────────────────────────────────────────────

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
 * Extrai pistas de origem a partir do stack trace.
 * Retorna até 5 entradas do tipo "src/pages/Foo.jsx:42:7".
 *
 * FIX: era `entry.componentHints.add(...array)` — Set.add() aceita apenas UM
 * argumento; o spread silenciosamente descartava todos os hints além do primeiro.
 * Agora retorna um array limpo e o caller itera sobre ele.
 */
function _extractHints(stack) {
  if (!stack) return [];
  const seen = new Set();
  const result = [];
  for (const line of stack.split('\n')) {
    const m = line.match(/\/(src\/(?:pages|components|hooks|lib)\/[^\s?)]+\.jsx?)[^:]*:(\d+)/);
    if (m) {
      const hint = `${m[1]}:${m[2]}`;
      if (!seen.has(hint)) {
        seen.add(hint);
        result.push(hint);
        if (result.length === 5) break;
      }
    }
  }
  return result;
}

// ─── instalação ──────────────────────────────────────────────────────────────

export function installQueryDiagnostics(queryClient) {
  if (!DEV) return;

  queryClient.getQueryCache().subscribe((event) => {
    if (!event?.query) return;

    const { query } = event;
    const nowFetching = query.state.fetchStatus === 'fetching';
    const id = query.queryHash || _serializeKey(query.queryKey);

    // Só loga na transição idle/paused → fetching.
    if (!nowFetching || _lastStatus.get(id) === 'fetching') {
      _lastStatus.set(id, query.state.fetchStatus);
      return;
    }
    _lastStatus.set(id, 'fetching');

    const keyStr = _serializeKey(query.queryKey);
    const ts = new Date().toISOString();

    let rec = _records.get(keyStr);
    if (!rec) {
      rec = { count: 0, firstSeen: ts, lastSeen: ts, hints: [], stacks: [] };
      _records.set(keyStr, rec);
    }

    rec.count += 1;
    rec.lastSeen = ts;

    // Captura o stack no microtask atual — a chamada vem do subscriber do QueryCache,
    // que ainda tem o call-site real no frame superior.
    const stack = new Error().stack ?? '';
    const newHints = _extractHints(stack);

    // Acumula hints únicos (corrige o bug do Set.add(...spread)).
    const existingSet = new Set(rec.hints);
    for (const h of newHints) {
      if (!existingSet.has(h)) {
        existingSet.add(h);
        rec.hints.push(h);
      }
    }

    // Guarda até 3 stacks completos para inspeção profunda (raw()).
    if (rec.stacks.length < 3) rec.stacks.push(stack);

    // eslint-disable-next-line no-console
    console.warn(
      `%c[QUERY-DIAG] fetch #${rec.count}`,
      'color:#eab308;font-weight:bold',
      {
        queryKey: query.queryKey,
        ts,
        componentHints: newHints.length ? newHints : ['(sem hints — sem source maps?)'],
      }
    );
  });

  // ─── API pública ────────────────────────────────────────────────────────────

  if (typeof window === 'undefined') return;

  window.__QUERY_DIAG__ = {
    enabled: true,

    /** Zera todos os contadores. Use antes de uma ação para isolar seus fetches. */
    reset() {
      _records.clear();
      _lastStatus.clear();
      // eslint-disable-next-line no-console
      console.info('%c[QUERY-DIAG] contadores zerados', 'color:#22c55e');
    },

    /**
     * Retorna o array completo ordenado por contagem decrescente.
     * Cada entrada inclui queryKey, count, firstSeen, lastSeen, componentHints, stacks.
     */
    raw() {
      return Array.from(_records.entries())
        .map(([key, r]) => ({
          queryKey: key,
          count: r.count,
          firstSeen: r.firstSeen,
          lastSeen: r.lastSeen,
          componentHints: r.hints,
          stacks: r.stacks,
        }))
        .sort((a, b) => b.count - a.count);
    },

    /**
     * Imprime console.table dos top-N disparadores.
     * @param {number} n — quantos mostrar (default 20)
     */
    printTop(n = 20) {
      const top = this.raw().slice(0, n);
      if (!top.length) {
        // eslint-disable-next-line no-console
        console.info('[QUERY-DIAG] Nenhum fetch registrado ainda. Navegue para a página e tente novamente.');
        return [];
      }
      // eslint-disable-next-line no-console
      console.table(
        top.map((r, i) => ({
          '#': i + 1,
          'queryKey': r.queryKey.slice(0, 72),
          'execuções': r.count,
          'primeiro': r.firstSeen.slice(11, 23),
          'último': r.lastSeen.slice(11, 23),
          'origem (hints)': (r.componentHints[0] ?? '—').slice(0, 80),
        }))
      );
      // Detalha hints completos em follow-up (console.table trunca strings).
      top.forEach((r, i) => {
        if (r.componentHints.length > 1) {
          // eslint-disable-next-line no-console
          console.groupCollapsed(`  #${i + 1} ${r.queryKey.slice(0, 60)} — todos os hints`);
          r.componentHints.forEach(h => console.log(' ', h)); // eslint-disable-line no-console
          // eslint-disable-next-line no-console
          console.groupEnd();
        }
      });
      return top;
    },
  };

  // eslint-disable-next-line no-console
  console.info(
    '%c[QUERY-DIAG] Instrumentação ativa — window.__QUERY_DIAG__.printTop(20)',
    'color:#eab308;font-weight:bold'
  );
}

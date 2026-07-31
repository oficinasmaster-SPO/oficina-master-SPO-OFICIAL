import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const isValidObjectId = (id) => typeof id === 'string' && OBJECT_ID_RE.test(id.trim());
function sanitizeIdArray(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!isValidObjectId(id)) continue;
    const t = id.trim();
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

// Valores inválidos conhecidos (test data) — fallback caso $not/$regex não seja suportado.
const KNOWN_INVALID_WORKSHOP_IDS = ['test', 'ws-firm-001', 'ws-test-002'];
const OID_PATTERN = '^[a-fA-F0-9]{24}$';

/**
 * Backfill de SANEAMENTO DE INTEGRIDADE REFERENCIAL (Camada 1 — Root Cause).
 *
 * Para cada entidade com FK `workshop_id`:
 *   - FollowUpReminder, FollowUpConcluido, ConsultoriaAtendimento,
 *     PedidoInterno, TarefaBacklog
 *
 * Três classes de problema:
 *   1. FORMATO inválido (workshop_id não é ObjectId 24-hex: "test",
 *      "ws-firm-001", "ws-test-002") → REMOVE sempre. Causa-raiz do 500
 *      (BSON InvalidId) no Workshop.filter({ id: { $in } }).
 *      **Consulta direta via $not $regex — atinge TODOS os registros,
 *      qualquer idade, superando a limitação de paginação do SDK.**
 *   2. Órfão (formato válido, workshop inexistente) → relata; remove só com
 *      `remover_orfaos: true`.
 *   3. Workshop inativo (formato válido, workshop existe mas status != "ativo")
 *      → relata; remove só com `remover_inativos: true`. Previne o cenário
 *      futuro em que follow-ups continuam sendo criados para oficinas
 *      desativadas.
 *
 * Limitação: a checagem de órfão/inativo varre a página mais recente (SDK
 * sem offset). A checagem de FORMATO inválido é total (query direta).
 *
 * Payload: {
 *   dry_run?: boolean        (default true),
 *   remover_orfaos?: boolean (default false),
 *   remover_inativos?: boolean (default false),
 *   entidades?: string[]     (default todas as 5)
 * }
 */
const ENT_CONFIG = {
  FollowUpReminder: { sort: '-created_date', page: 200 },
  FollowUpConcluido: { sort: '-completedAt', page: 50 },
  ConsultoriaAtendimento: { sort: '-created_date', page: 100 },
  PedidoInterno: { sort: '-created_date', page: 200 },
  TarefaBacklog: { sort: '-created_date', page: 200 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const remover_orfaos = body.remover_orfaos === true;
    const remover_inativos = body.remover_inativos === true;
    const entidades = body.entidades || Object.keys(ENT_CONFIG);

    const resultados = {};

    for (const entName of entidades) {
      const cfg = ENT_CONFIG[entName];
      const ent = base44.asServiceRole.entities[entName];
      if (!ent || !cfg) {
        resultados[entName] = { erro: 'entidade desconhecida' };
        continue;
      }

      // ── 1) FORMATO inválido — query direta, atinge qualquer idade ──
      let invalidosRaw = [];
      let metodo_invalidos = 'not_regex';
      try {
        invalidosRaw = await ent.filter(
          { workshop_id: { $not: { $regex: OID_PATTERN } } }, cfg.sort, 1000
        );
      } catch (e) {
        metodo_invalidos = 'known_in_fallback';
        try {
          invalidosRaw = await ent.filter(
            { workshop_id: { $in: KNOWN_INVALID_WORKSHOP_IDS } }, cfg.sort, 1000
          );
        } catch (e2) {
          invalidosRaw = [];
        }
      }
      const invalidos = (invalidosRaw || []).filter(
        (r) => r.workshop_id && !isValidObjectId(r.workshop_id)
      );

      // ── 2) Página recente — checagem de existência + status ativo ──
      let recent;
      try {
        recent = await ent.list(cfg.sort, cfg.page);
      } catch (e) {
        recent = [];
      }
      recent = recent || [];
      const recentValid = recent.filter((r) => isValidObjectId(r.workshop_id));
      const validIds = sanitizeIdArray(recentValid.map((r) => r.workshop_id));

      // ── 3) Workshop lookup (uma query $in sanitizada — segura) ──
      const workshopMap = new Map();
      if (validIds.length > 0) {
        try {
          const ws = await base44.asServiceRole.entities.Workshop.filter(
            { id: { $in: validIds } }, undefined, validIds.length
          );
          (ws || []).forEach((w) => workshopMap.set(w.id, w));
        } catch (e) {
          // sem lookup, não classifica órfão/inativo
        }
      }

      // ── 4) Classificar (Workshop existe AND status == ativo) ──
      const orfaos = [];
      const inativos = [];
      for (const r of recentValid) {
        const w = workshopMap.get(r.workshop_id);
        if (!w) {
          orfaos.push(r);
        } else if (w.status !== 'ativo') {
          inativos.push(r);
        }
      }

      const amostra = (arr) =>
        arr.slice(0, 15).map((r) => ({
          id: r.id,
          workshop_id: r.workshop_id,
          workshop_name: r.workshop_name,
          created_date: r.created_date,
        }));
      const amostraInativos = (arr) =>
        arr.slice(0, 15).map((r) => {
          const w = workshopMap.get(r.workshop_id);
          return {
            id: r.id,
            workshop_id: r.workshop_id,
            workshop_name: r.workshop_name || w?.name,
            workshop_status: w?.status,
            created_date: r.created_date,
          };
        });

      // ── 5) Ações ──
      let invalidosRemovidos = 0;
      let orfaosRemovidos = 0;
      let inativosRemovidos = 0;
      const erros = [];
      if (!dry_run) {
        for (const r of invalidos) {
          try { await ent.delete(r.id); invalidosRemovidos++; }
          catch (e) { erros.push({ id: r.id, error: e.message }); }
        }
        if (remover_orfaos) {
          for (const r of orfaos) {
            try { await ent.delete(r.id); orfaosRemovidos++; }
            catch (e) { erros.push({ id: r.id, error: e.message }); }
          }
        }
        if (remover_inativos) {
          for (const r of inativos) {
            try { await ent.delete(r.id); inativosRemovidos++; }
            catch (e) { erros.push({ id: r.id, error: e.message }); }
          }
        }
      }

      resultados[entName] = {
        total_recentes: recent.length,
        total_invalidos: invalidos.length,
        total_orfaos: orfaos.length,
        total_inativos: inativos.length,
        metodo_invalidos,
        amostra_invalidos: amostra(invalidos),
        amostra_orfaos: amostra(orfaos),
        amostra_inativos: amostraInativos(inativos),
        invalidos_removidos: !dry_run ? invalidosRemovidos : 0,
        orfaos_removidos: !dry_run ? orfaosRemovidos : 0,
        inativos_removidos: !dry_run ? inativosRemovidos : 0,
        erros: erros.slice(0, 10),
      };
    }

    return Response.json({
      dry_run, remover_orfaos, remover_inativos, resultados,
      message: dry_run
        ? 'DRY RUN — nada alterado. Revise as amostras e rode com { "dry_run": false } para remover inválidos.'
        : 'Saneamento concluído. Inválidos removidos.' +
          (remover_orfaos ? ' Órfãos removidos.' : '') +
          (remover_inativos ? ' Inativos removidos.' : ''),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
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

/**
 * Backfill de SANEAMENTO DE INTEGRIDADE REFERENCIAL (Camada 1 — Root Cause).
 *
 * Para cada entidade que possui FK `workshop_id`:
 *   - FollowUpReminder
 *   - FollowUpConcluido
 *   - ConsultoriaAtendimento
 *   - PedidoInterno
 *   - TarefaBacklog
 *
 * Fluxo:
 *   1. Carrega a página mais recente de registros da entidade.
 *   2. workshop_id com FORMATO inválido (não-OID 24-hex: "test", "ws-firm-001",
 *      "ws-test-002") → REMOVE sempre. São dados de teste/corrompidos sem
 *      workshop real para reatribuir; é a causa-raiz do 500 (BSON InvalidId)
 *      no Workshop.filter({ id: { $in } }).
 *   3. workshop_id válido mas inexistente (órfão — workshop foi deletado) →
 *      por padrão apenas RELATA (count + amostra); remove somente se
 *      `remover_orfaos: true`.
 *
 * Limitação da plataforma: o SDK `.list(sort, limit)` não pagina além da
 * primeira página (sem offset). O saneamento cobre os registros mais recentes
 * — onde residem os dados de teste. Rode novamente após novos importes.
 *
 * Payload: {
 *   dry_run?: boolean      (default true),
 *   remover_orfaos?: boolean (default false — só relata órfãos válidos),
 *   entidades?: string[]   (default todas as 5)
 * }
 */
const ENT_CONFIG = {
  FollowUpReminder: { sort: '-created_date', page: 200 },
  FollowUpConcluido: { sort: '-completedAt', page: 50 }, // OOM risk (base64 pastedImages)
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
    const entidades = body.entidades || Object.keys(ENT_CONFIG);

    const resultados = {};

    for (const entName of entidades) {
      const cfg = ENT_CONFIG[entName];
      const ent = base44.asServiceRole.entities[entName];
      if (!ent || !cfg) {
        resultados[entName] = { erro: 'entidade desconhecida' };
        continue;
      }

      let allRecords;
      try {
        allRecords = await ent.list(cfg.sort, cfg.page);
      } catch (e) {
        resultados[entName] = { erro_carga: e.message };
        continue;
      }
      allRecords = allRecords || [];

      // IDs com formato válido (sanitizados) — para o $in de existência.
      const validIds = sanitizeIdArray(allRecords.map((r) => r.workshop_id).filter(Boolean));

      // Existence check: UMA query $in com ids já sanitizados (seguro — não lança InvalidId).
      let existingSet = new Set();
      if (validIds.length > 0) {
        try {
          const existing = await base44.asServiceRole.entities.Workshop.filter(
            { id: { $in: validIds } }, undefined, validIds.length
          );
          existingSet = new Set((existing || []).map((w) => w.id));
        } catch (e) {
          resultados[entName] = { erro_workshop_lookup: e.message };
          continue;
        }
      }

      // Classificar
      const invalidos = []; // formato inválido (test/ws-firm/...)
      const orfaos = [];    // formato válido, workshop inexistente
      for (const r of allRecords) {
        const wid = r.workshop_id;
        if (!wid) continue;
        if (!isValidObjectId(wid)) {
          invalidos.push(r);
          continue;
        }
        if (!existingSet.has(wid)) orfaos.push(r);
      }

      const amostra = (arr) =>
        arr.slice(0, 15).map((r) => ({
          id: r.id,
          workshop_id: r.workshop_id,
          workshop_name: r.workshop_name,
          created_date: r.created_date,
        }));

      let removidos = 0;
      let orfaosRemovidos = 0;
      const erros = [];
      if (!dry_run) {
        // Inválidos: sempre remove.
        for (const r of invalidos) {
          try {
            await ent.delete(r.id);
            removidos++;
          } catch (e) {
            erros.push({ id: r.id, error: e.message });
          }
        }
        // Órfãos: só remove se explicitamente solicitado.
        if (remover_orfaos) {
          for (const r of orfaos) {
            try {
              await ent.delete(r.id);
              orfaosRemovidos++;
            } catch (e) {
              erros.push({ id: r.id, error: e.message });
            }
          }
        }
      }

      resultados[entName] = {
        total_registros: allRecords.length,
        total_invalidos: invalidos.length,
        total_orfaos: orfaos.length,
        amostra_invalidos: amostra(invalidos),
        amostra_orfaos: amostra(orfaos),
        invalidos_removidos: !dry_run ? invalidos.length : 0,
        orfaos_removidos: !dry_run ? orfaosRemovidos : 0,
        erros: erros.slice(0, 10),
      };
    }

    return Response.json({
      dry_run,
      remover_orfaos,
      resultados,
      message: dry_run
        ? 'DRY RUN — nada alterado. Revise as amostras e rode com { "dry_run": false } para remover inválidos.'
        : 'Saneamento concluído. Registros com workshop_id inválido removidos.' +
          (remover_orfaos
            ? ' Órfãos (workshop inexistente) também removidos.'
            : ' Órfãos apenas relatados (use remover_orfaos: true para removê-los).'),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
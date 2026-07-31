import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const isValidObjectId = (id) => typeof id === 'string' && OBJECT_ID_RE.test(id.trim());

/**
 * Backfill — corrige FollowUpReminder / FollowUpConcluido cujo `workshop_id`
 * tem FORMATO inválido (não é ObjectId de 24 hex).
 *
 * Causa-raiz EXATA do 500 (BSON InvalidId) no Workshop.filter({ id: { $in } })
 * da Central de Follow-up em "Todos os Consultores": registros legados/de teste
 * com workshop_id === "test" | "ws-firm-001" | "ws-test-002" chegavam intactos
 * ao $in, e o MongoDB rejeita strings curtas/não-hex como ObjectId.
 *
 * Escopo: somente FORMATO inválido. "Workshop inexistente" (ObjectId válido mas
 * órfão) NÃO lança InvalidId — retorna vazio, não quebra. Logo não consultamos
 * Workshop (evita OOM por logo_url/base64). Higiene de órfãos pode ser outro
 * backfill se necessário.
 *
 * Ação: REMOVER os registros com formato inválido (o campo workshop_id é
 * obrigatório/string no schema — não aceita null; registros de teste/órfãos
 * não têm workshop real para reatribuir).
 *
 * Payload: { dry_run?: boolean (default true), entidades?: string[] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false;
    const entidades = body.entidades || ['FollowUpReminder', 'FollowUpConcluido'];

    const resultados = {};

    for (const entName of entidades) {
      const ent = base44.asServiceRole.entities[entName];
      if (!ent) continue;

      let records;
      try {
        const sortField = entName === 'FollowUpConcluido' ? '-completedAt' : '-created_date';
        records = await ent.list(sortField, 200);
      } catch (e) {
        resultados[entName] = { erro_carga: e.message };
        continue;
      }

      const invalidos = records.filter(r => {
        const wid = r.workshop_id;
        if (!wid) return false; // null/empty não quebra $in
        return !isValidObjectId(wid);
      });

      const amostra = invalidos.slice(0, 30).map(r => ({
        id: r.id,
        workshop_id: r.workshop_id,
        workshop_name: r.workshop_name,
        created_date: r.created_date,
      }));

      let corrigidos = 0;
      const erros = [];
      if (!dry_run) {
        for (const r of invalidos) {
          try {
            await ent.delete(r.id);
            corrigidos++;
          } catch (e) {
            erros.push({ id: r.id, error: e.message });
          }
        }
      }

      resultados[entName] = {
        total_registros: records.length,
        total_invalidos: invalidos.length,
        amostra,
        corrigidos,
        erros: erros.slice(0, 10),
      };
    }

    return Response.json({
      dry_run,
      resultados,
      message: dry_run
        ? 'DRY RUN — nada alterado. Rode com { "dry_run": false } para aplicar.'
        : 'Backfill concluído. workshop_id com formato inválido setados para null.',
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
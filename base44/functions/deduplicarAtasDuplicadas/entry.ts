/**
 * deduplicarAtasDuplicadas
 *
 * Remove ATAs duplicadas criadas pelo bug de duplo clique.
 * Critério de duplicação: mesmo (workshop_id, atendimento_id, meeting_date, tipo_aceleracao,
 * consultor_id) com status "finalizada" ou "concluida" — mantém a MAIS ANTIGA, deleta as demais.
 *
 * Admin-only. Retorna relatório com quantas foram deletadas.
 *
 * TDD: toda a lógica de agrupamento é pura e testável sem banco.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Pure grouping logic (testable) ──────────────────────────────────────────

/**
 * Agrupa ATAs por chave de duplicação.
 * @param {Array} atas
 * @returns {Map<string, Array>} groups with more than 1 element
 */
export function groupDuplicates(atas) {
  const map = new Map();

  for (const ata of atas) {
    // Normaliza data para só o dia (ignora hora)
    const day = (ata.meeting_date || ata.created_date || "").slice(0, 10);
    const key = [
      ata.workshop_id || "",
      ata.atendimento_id || "",
      day,
      ata.tipo_aceleracao || ata.tipo_atendimento || "",
      ata.consultor_id || "",
    ].join("|");

    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ata);
  }

  // Only return groups with actual duplicates
  const duplicateGroups = new Map();
  for (const [key, group] of map.entries()) {
    if (group.length > 1) duplicateGroups.set(key, group);
  }
  return duplicateGroups;
}

/**
 * Given a group of duplicate ATAs, decide which to KEEP and which to DELETE.
 * Strategy: keep the oldest (created_date ASC), delete the rest.
 * @param {Array} group
 * @returns {{ keep: Object, toDelete: Array }}
 */
export function resolveGroup(group) {
  const sorted = [...group].sort((a, b) => {
    const da = a.created_date || a.meeting_date || "";
    const db = b.created_date || b.meeting_date || "";
    return da.localeCompare(db);
  });
  const [keep, ...toDelete] = sorted;
  return { keep, toDelete };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default: dry_run = true (safe)

    // Fetch all finalized/concluded ATAs
    const atas = await base44.asServiceRole.entities.MeetingMinutes.list("-created_date", 2000);

    const finalized = atas.filter(a =>
      a.status === 'finalizada' || a.status === 'concluida' || a.status === 'finalizado'
    );

    const groups = groupDuplicates(finalized);
    const report = [];
    let totalDeleted = 0;

    for (const [key, group] of groups.entries()) {
      const { keep, toDelete } = resolveGroup(group);

      const entry = {
        key,
        kept: { id: keep.id, created_date: keep.created_date, status: keep.status },
        deleted: toDelete.map(a => ({ id: a.id, created_date: a.created_date, status: a.status })),
      };
      report.push(entry);

      if (!dryRun) {
        for (const ata of toDelete) {
          await base44.asServiceRole.entities.MeetingMinutes.delete(ata.id);
          totalDeleted++;
        }
      } else {
        totalDeleted += toDelete.length;
      }
    }

    return Response.json({
      mode: dryRun ? "dry_run" : "executed",
      duplicate_groups: groups.size,
      total_duplicates_found: totalDeleted,
      total_deleted: dryRun ? 0 : totalDeleted,
      report,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
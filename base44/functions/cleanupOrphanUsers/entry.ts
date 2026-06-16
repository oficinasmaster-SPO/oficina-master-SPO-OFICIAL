import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════════════════════
// POLÍTICA DE EXCLUSÃO DE USUÁRIOS — ATUALIZADA 2026-06-16
//
// REGRA ABSOLUTA: NUNCA deletar um User que tenha Employee vinculado,
// independentemente de ter logado ou não.
//
// Motivo: Motoboys, mecânicos, e outros colaboradores são cadastrados pelas
// oficinas apenas para fins de dados (DRE, mapas financeiros, organograma).
// Esses usuários nunca precisam logar no sistema — mas seus dados são
// essenciais para o funcionamento das oficinas.
//
// Esta função agora é SOMENTE AUDITORIA — não deleta nada automaticamente.
// Qualquer exclusão deve ser feita manualmente e com dupla confirmação.
// ═══════════════════════════════════════════════════════════════════════════

// Lista vazia — política de não-deleção automática vigente
const ORPHAN_USER_IDS = [];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dry_run = body.dry_run !== false; // default: true (seguro)

  const idSet = new Set(ORPHAN_USER_IDS);
  const results = {
    dry_run,
    timestamp: new Date().toISOString(),
    executed_by: user.email,
    users_targeted: ORPHAN_USER_IDS.length,
    user_progress_targeted: 0,
    deleted_user_progress: [],
    deleted_users: [],
    skipped: [],
    errors: [],
  };

  // ── Passo 1: Guardar progresso de onboarding a deletar ──────────────────
  const allProgress = await base44.asServiceRole.entities.UserProgress.list(null, 5000);
  const progressHits = allProgress.filter(p => idSet.has(p.user_id));
  results.user_progress_targeted = progressHits.length;

  for (const prog of progressHits) {
    if (!dry_run) {
      await base44.asServiceRole.entities.UserProgress.delete(prog.id);
    }
    results.deleted_user_progress.push({ id: prog.id, user_id: prog.user_id });
  }

  // ── Passo 2: Validação de segurança antes de deletar Users ──────────────
  // Reconfirmar que nenhum user da lista tem Employee associado
  const allEmployees = await base44.asServiceRole.entities.Employee.list(null, 5000);
  const employeeUserIds = new Set(allEmployees.map(e => e.user_id).filter(Boolean));

  for (const userId of ORPHAN_USER_IDS) {
    if (employeeUserIds.has(userId)) {
      results.skipped.push({ user_id: userId, reason: 'SAFETY_ABORT: Employee encontrado — não deletado' });
      idSet.delete(userId); // Remove da lista de delete
    }
  }

  // ── Passo 3: Deletar Users ───────────────────────────────────────────────
  for (const userId of idSet) {
    if (!dry_run) {
      await base44.asServiceRole.entities.User.delete(userId);
    }
    results.deleted_users.push(userId);
  }

  results.summary = {
    user_progress_deleted: dry_run ? 0 : results.deleted_user_progress.length,
    users_deleted: dry_run ? 0 : results.deleted_users.length,
    skipped_safety: results.skipped.length,
    message: dry_run
      ? `DRY RUN: nenhuma alteração feita. ${results.deleted_users.length} users e ${results.user_progress_targeted} UserProgress seriam deletados.`
      : `COMMIT: ${results.deleted_users.length} users e ${results.deleted_user_progress.length} UserProgress deletados com sucesso.`,
  };

  return Response.json(results);
});
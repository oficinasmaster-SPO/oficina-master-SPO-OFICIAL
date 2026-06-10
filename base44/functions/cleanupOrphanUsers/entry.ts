import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lista fixa auditada em 2026-06-10 — CADASTRO_FANTASMA + WORKSHOP_DELETADO
const ORPHAN_USER_IDS = [
  "69737b66f9a1148bb7f9a0d4", // contatobrmecanica@gmail.com       — WORKSHOP_DELETADO
  "697b97c88c4c2cfc90c22e56", // junior.andrade117@gmail.com        — CADASTRO_FANTASMA
  "697b999aac7351a155716a4a", // diogo.souza19@hotmail.com          — CADASTRO_FANTASMA
  "697ba00768c30ad48ca8f46d", // jf.acauto@gmail.com                — CADASTRO_FANTASMA
  "697ba13ef2bafac48a8c6bd8", // jessicade.castro@outlook.com       — CADASTRO_FANTASMA
  "697ba26945ed323ffd31960f", // geraldotag@gmail.com               — CADASTRO_FANTASMA
  "698120e8d092ba67cb9f9388", // mecremi@yahoo.com.br               — CADASTRO_FANTASMA
  "6984ec5475b6e03ca82eb772", // recuperadoraguinshop@gmail.com     — CADASTRO_FANTASMA
  "6984edb1cb609fcef0a41ae2", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "69936b0dcdb6b4aff90bcd3b", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "69936bbfef3ec2957b8f2235", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "69936c4e823e3dccd5614fc7", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "699c982b123affeca4de73a5", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "69b3fe76103464dce24e76ce", // ghrs.guilherme@gmail.com           — CADASTRO_FANTASMA
  "69bc5633199c0b5381395766", // mateus.ssaraiva01@gmail.com        — WORKSHOP_DELETADO
  "69cd605c2503f4c88e1f1b28", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "69e91e36b838adb8d72841aa", // tatianedejota@gmail.com            — WORKSHOP_DELETADO
  "6a0e0e8753967fd8c3e19837", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a0e0ef56b42b6f8abf2ebfa", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a0f6249b9de0c75652249ba", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a0f935bd02b4737c665107d", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a104c5db292c2b480f8e1c6", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a109433a5d8bddb8b2e61d6", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a15a6b353c0d4f811e87e8f", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a15dd418704e58f9c98589d", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a16f652d758291cea52df1c", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a171993a6025adf77961276", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a17cac7a7a64ed9cb3a4ba9", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
  "6a28043c08a3c03a97486e27", // (outro cadastro fantasma)          — CADASTRO_FANTASMA
];

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
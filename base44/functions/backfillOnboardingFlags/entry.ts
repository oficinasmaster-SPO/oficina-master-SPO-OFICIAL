import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * backfillOnboardingFlags
 * 
 * CAUSA RAIZ IDENTIFICADA (2026-06-12):
 * Owners que criaram workshops mas não chegaram a clicar "Finalizar Cadastro"
 * ficam com first_access_completed/profile_completed/cadastro_finalizado = undefined.
 * O handleFinish na página Cadastro é o único lugar que seta essas flags — se o
 * usuário fechar o browser antes, elas ficam ausentes para sempre.
 * 
 * Este backfill corrige todos os owners de workshops ativos que têm essas flags ausentes.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default: dry_run=true (seguro)
    const limit = body.limit || 200;

    console.log(`[backfillOnboardingFlags] dry_run=${dryRun}, limit=${limit}`);

    // Buscar workshops ativos
    const workshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo' }, '-created_date', limit
    );

    const ownerIds = [...new Set(workshops.map(w => w.owner_id).filter(Boolean))];
    console.log(`[backfillOnboardingFlags] ${ownerIds.length} owners únicos de ${workshops.length} workshops`);

    const toFix = [];
    const alreadyOk = [];
    const errors = [];

    // Processar sequencialmente com delay para evitar rate limit
    for (let i = 0; i < ownerIds.length; i++) {
      const batch = [ownerIds[i]];
      await Promise.all(batch.map(async (ownerId) => {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ id: ownerId });
          if (!users || users.length === 0) return;
          const u = users[0];

          const needsFix = u.first_access_completed == null
            || u.profile_completed == null
            || u.cadastro_finalizado == null;

          if (!needsFix) {
            alreadyOk.push(u.email);
            return;
          }

          toFix.push({
            id: u.id,
            email: u.email,
            role: u.role,
            first_access_completed: u.first_access_completed,
            profile_completed: u.profile_completed,
            cadastro_finalizado: u.cadastro_finalizado,
            cadastro_em_andamento: u.cadastro_em_andamento,
          });

          if (!dryRun) {
            await base44.asServiceRole.entities.User.update(u.id, {
              first_access_completed: true,
              profile_completed: true,
              cadastro_finalizado: true,
              cadastro_em_andamento: false,
            });
            console.log(`[backfillOnboardingFlags] ✅ Corrigido: ${u.email}`);
          }
        } catch (e) {
          errors.push({ ownerId, error: e.message });
        }
      }));
      // Delay entre cada user para evitar rate limit
      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      summary: {
        owners_checked: ownerIds.length,
        already_ok: alreadyOk.length,
        to_fix: toFix.length,
        fixed: dryRun ? 0 : toFix.length,
        errors: errors.length,
      },
      to_fix: toFix,
      errors,
    });

  } catch (error) {
    console.error('[backfillOnboardingFlags] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
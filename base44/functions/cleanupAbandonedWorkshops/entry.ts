import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * R3 — Limpeza de Workshops rascunho abandonados (Opção B)
 *
 * Detecta Workshops em status 'rascunho' com mais de 48h sem Employee vinculado.
 * Esses são registros criados por Cadastro.jsx quando o usuário abandonou o
 * onboarding antes de completar o cadastro do sócio.
 *
 * Agendamento recomendado: diário, às 03:00
 *
 * GET  ?dry_run=true → mostra o que seria inativado, sem alterar
 * POST {}            → executa a limpeza
 */

const ABANDONED_THRESHOLD_HOURS = 48;
const ORPHAN_USER_NOTIFY_DAYS = 7;   // Notificar user órfão após 7 dias sem completar cadastro
const ORPHAN_USER_REMOVE_DAYS = 30;  // Remover user órfão após 30 dias sem completar cadastro
const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e'; // Sócio - Acesso Total

// Telemetria estruturada — grava em SystemEventLog
async function logEvent(base44, event_type, payload) {
  const timestamp = new Date().toISOString();
  console.log(`[${event_type}]`, JSON.stringify({ event_type, timestamp, ...payload }));
  try {
    await base44.asServiceRole.entities.SystemEventLog.create({
      event_type,
      entity_type: 'Workshop',
      entity_id: payload.workshop_id || null,
      workshop_id: payload.workshop_id || null,
      triggered_by: 'automation',
      status: 'success',
      details: payload,
      timestamp
    });
  } catch (_) { /* telemetria nunca deve bloquear a operação principal */ }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';

    const cutoff = new Date(Date.now() - ABANDONED_THRESHOLD_HOURS * 60 * 60 * 1000);

    // Buscar workshops rascunho
    const rascunhos = await base44.asServiceRole.entities.Workshop.filter({ status: 'rascunho' });

    const abandoned = [];
    const recovered = [];

    for (const ws of rascunhos) {
      const createdAt = new Date(ws.created_date);

      // PROTEÇÃO: Recente (< 48h) — pode ainda estar em onboarding ativo. Não tocar.
      if (createdAt > cutoff) continue;

      // Buscar owner para verificar último acesso
      let ownerLastAccess = null;
      try {
        const ownerUser = await base44.asServiceRole.entities.User.get(ws.owner_id);
        if (ownerUser?.last_login_at) {
          ownerLastAccess = new Date(ownerUser.last_login_at);
        }
      } catch (_) {}

      // PROTEÇÃO: Owner acessou recentemente (< 48h) — onboarding pode estar em andamento. Não tocar.
      if (ownerLastAccess && ownerLastAccess > cutoff) {
        console.log(`⏭️ [R3] Workshop ${ws.id} ignorado — owner com acesso recente (${ownerLastAccess.toISOString()})`);
        continue;
      }

      // Verificar se tem Employee ativo
      const employees = await base44.asServiceRole.entities.Employee.filter({
        workshop_id: ws.id,
        status: 'ativo'
      });

      if (employees.length > 0) {
        // Tem Employee e tem nome — onboarding incompleto mas não abandonado. Promover para ativo.
        if (ws.name && ws.name.trim() !== '') {
          recovered.push({
            workshop_id: ws.id,
            name: ws.name,
            owner_id: ws.owner_id,
            action: 'promote_to_ativo',
            employee_count: employees.length
          });
          if (!dry_run) {
            await base44.asServiceRole.entities.Workshop.update(ws.id, { status: 'ativo' });
            await logEvent(base44, 'WORKSHOP_RECOVERY', {
              workshop_id: ws.id,
              owner_id: ws.owner_id,
              action: 'promote_to_ativo',
              reason: 'Rascunho com Employee e nome — promovido para ativo',
              employee_count: employees.length
            });
          }
        }
        continue;
      }

      // Sem Employee — verificar se owner tem outro workshop ativo
      const ownerWorkshops = await base44.asServiceRole.entities.Workshop.filter({
        owner_id: ws.owner_id,
        status: 'ativo'
      });

      if (ownerWorkshops.length > 0) {
        // Owner tem workshop ativo — este rascunho é duplicata. Inativar.
        abandoned.push({
          workshop_id: ws.id,
          name: ws.name || '(sem nome)',
          owner_id: ws.owner_id,
          created_date: ws.created_date,
          age_hours: Math.round((Date.now() - createdAt.getTime()) / 3600000),
          action: 'inativar_duplicata',
          reason: 'Owner já tem workshop ativo'
        });
        if (!dry_run) {
          await base44.asServiceRole.entities.Workshop.update(ws.id, { status: 'inativo' });
          await logEvent(base44, 'WORKSHOP_DEACTIVATED', {
            workshop_id: ws.id,
            owner_id: ws.owner_id,
            action: 'inativar_duplicata',
            reason: 'Owner já tem workshop ativo — rascunho é duplicata'
          });
        }
      } else {
        // Owner sem workshop ativo — criar Employee placeholder para recuperar acesso.
        abandoned.push({
          workshop_id: ws.id,
          name: ws.name || '(sem nome)',
          owner_id: ws.owner_id,
          created_date: ws.created_date,
          age_hours: Math.round((Date.now() - createdAt.getTime()) / 3600000),
          action: 'create_placeholder_employee',
          reason: 'Signup abandonado — criando Employee para recuperar acesso'
        });
        if (!dry_run) {
          await base44.asServiceRole.entities.Employee.create({
            workshop_id: ws.id,
            user_id: ws.owner_id,
            full_name: 'Proprietário',
            email: '',
            job_role: 'socio',
            profile_id: SOCIO_PROFILE_ID,
            status: 'ativo',
            user_status: 'ativo',
            tipo_vinculo: 'cliente',
            is_partner: true,
            hire_date: new Date().toISOString().split('T')[0]
          });
          await logEvent(base44, 'OWNER_EMPLOYEE_CREATED', {
            workshop_id: ws.id,
            owner_id: ws.owner_id,
            action: 'create_placeholder_employee',
            reason: 'Signup abandonado — Employee placeholder criado para recuperar acesso'
          });
        }
      }
    }

    // Tracking de execução — apenas em POST (não dry_run)
    if (!dry_run) {
      const duration_ms = Date.now() - startTime;
      try {
        await base44.asServiceRole.entities.SystemEventLog.create({
          event_type: 'FUNCTION_EXECUTED',
          entity_type: 'Workshop',
          triggered_by: 'automation',
          status: 'success',
          details: {
            function_name: 'cleanupAbandonedWorkshops',
            processed_count: abandoned.length + recovered.length,
            duration_ms,
            rascunhos_encontrados: rascunhos.length,
            abandoned: abandoned.length,
            recovered: recovered.length
          },
          timestamp: new Date().toISOString()
        });
      } catch (_) {}
    }

    return Response.json({
      mode: dry_run ? 'dry_run' : 'execute',
      threshold_hours: ABANDONED_THRESHOLD_HOURS,
      rascunhos_encontrados: rascunhos.length,
      recentes_ignorados: rascunhos.length - abandoned.length - recovered.length,
      recovered,
      abandoned,
      actions_taken: dry_run ? 0 : abandoned.length + recovered.length
    });

  } catch (err) {
    console.error('[R3] Erro:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
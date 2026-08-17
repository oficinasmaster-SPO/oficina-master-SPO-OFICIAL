import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Follow-up Guarda-Chuva Semanal
 *
 * Executa toda segunda-feira às 09:00.
 * Varre workshops ativos com planos elegíveis (não-FREE).
 * Cria 1 FollowUpReminder se o workshop não tem FU nos próximos 7 dias.
 *
 * S1-01: shiftToBusinessDay — reminder_date = hoje + 7d, recuado p/ sexta se cair em sáb/dom
 * S1-03: consultor_id = workshop.consultor_principal_id (não mais o admin logado)
 * S1-03: todas as queries via asServiceRole (não mais user-scoped)
 * S1-01: guard FREE — workshops plano FREE são bloqueados automaticamente
 */

// S1-01: Recua sábado(6) e domingo(0) para a sexta-feira anterior (BRT)
function shiftToBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00.000Z');
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // sáb → sex
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2); // dom → sex
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: apenas administradores', success: false }, { status: 403 });
    }

    const {
      dry_run = false,
      planos_elegiveis = ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS']
    } = await req.json().catch(() => ({}));

    console.log(`[GUARDA-CHUVA] Iniciando — dry_run: ${dry_run}`);

    // S1-03: asServiceRole para ver todos os workshops sem restrição de RLS
    const todosWorkshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo' }, 'name', 500
    );

    console.log(`[GUARDA-CHUVA] Workshops ativos: ${todosWorkshops.length}`);

    const metrics = { total: todosWorkshops.length, plano_nao_elegivel: 0, com_fu: 0, criados: 0, falhas: 0 };
    const processados = [];
    const erros = [];

    // S1-01: calcular reminder_date = hoje + 7d, com shiftToBusinessDay
    const hoje = new Date();
    const rawTarget = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
    const reminderDate = shiftToBusinessDay(rawTarget.toISOString().split('T')[0]);
    const hojeStr = hoje.toISOString().split('T')[0];
    const proximos7Str = rawTarget.toISOString().split('T')[0];

    for (const workshop of todosWorkshops) {
      try {
        // Guard plano: FREE é bloqueado; planos_elegiveis devem incluir o plano
        const plano = workshop.planoAtual || 'FREE';
        if (!planos_elegiveis.includes(plano)) {
          console.log(`[GUARDA-CHUVA] SKIP ${workshop.name}: plano ${plano} não elegível`);
          metrics.plano_nao_elegivel++;
          continue;
        }

        // S1-03: asServiceRole nas leituras de FU
        const fuPendentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
          workshop_id: workshop.id,
          is_completed: false,
          reminder_date: { $gte: hojeStr, $lte: proximos7Str }
        });

        if (fuPendentes && fuPendentes.length > 0) {
          console.log(`[GUARDA-CHUVA] SKIP ${workshop.name}: já tem ${fuPendentes.length} FU(s) nos próximos 7 dias`);
          metrics.com_fu++;
          continue;
        }

        // S1-03: consultor = consultor_principal_id do workshop (não o admin logado)
        const consultor_id   = workshop.consultor_principal_id   || user.id;
        const consultor_nome = workshop.consultor_principal_nome || user.full_name || 'Admin';

        console.log(`[GUARDA-CHUVA] ELEGÍVEL ${workshop.name} → consultor: ${consultor_nome}, reminder: ${reminderDate}`);

        if (dry_run) {
          processados.push({ workshop_id: workshop.id, workshop_name: workshop.name, action: 'would_create', consultor_id, consultor_nome, reminder_date: reminderDate });
          continue;
        }

        const followUpData = {
          workshop_id:             workshop.id,
          workshop_name:           workshop.name,
          consultor_id,
          consultor_nome,
          consultor_principal_id:  workshop.consultor_principal_id || null,
          consultor_principal_nome: workshop.consultor_principal_nome || null,
          reminder_date:           reminderDate,
          sequence_number:         1,
          days_since_meeting:      7,
          message:                 `Follow-up preventivo semanal — ${workshop.name} está sem contato agendado para os próximos 7 dias.`,
          canal_origem:            'preventivo',
          origin_type:             'guarda_chuva',
          atribuicao_automatica:   true,
          is_completed:            false,
          consulting_firm_id:      workshop.consulting_firm_id || null,
        };

        // S1-03: asServiceRole na criação para não herdar RLS do admin
        const criado = await base44.asServiceRole.entities.FollowUpReminder.create(followUpData);

        console.log(`[GUARDA-CHUVA] ✅ FU criado para ${workshop.name} (ID: ${criado.id}) em ${reminderDate}`);
        metrics.criados++;
        processados.push({ workshop_id: workshop.id, workshop_name: workshop.name, action: 'created', followup_id: criado.id, consultor_id, consultor_nome, reminder_date: reminderDate });

      } catch (e) {
        console.error(`[GUARDA-CHUVA] ERRO ${workshop.name}:`, e.message);
        metrics.falhas++;
        erros.push({ workshop_id: workshop.id, workshop_name: workshop.name, error: e.message });
      }
    }

    console.log('[GUARDA-CHUVA] Finalizado:', metrics);
    return Response.json({ success: true, timestamp: new Date().toISOString(), dry_run, metrics, processados, erros });

  } catch (error) {
    console.error('[GUARDA-CHUVA] Erro crítico:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

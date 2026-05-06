import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * DS-FIX-A: Script de reparo — preenche consulting_firm_id nos workshops que não têm o campo.
 * Executar 1x via invoke (admin only).
 *
 * Lógica: Para cada workshop sem consulting_firm_id, busca o Employee do owner_id
 * ou um Employee vinculado ao workshop, e pega o consulting_firm_id do usuário/admin responsável.
 * Aceita também `consulting_firm_id` no body para forçar um valor específico para todos.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { /* body opcional */ }

    const { consulting_firm_id: forcedFirmId, dry_run = false } = body;

    // Buscar todos os workshops sem consulting_firm_id (ou com valor vazio)
    const allWorkshops = await base44.asServiceRole.entities.Workshop.list('name', 2000);
    const withoutFirm = allWorkshops.filter(w => !w.consulting_firm_id);

    console.log(`[repairWorkshopConsultingFirmId] Total workshops: ${allWorkshops.length}, sem consulting_firm_id: ${withoutFirm.length}`);

    if (withoutFirm.length === 0) {
      return Response.json({ success: true, message: 'Todos os workshops já têm consulting_firm_id', updated: 0 });
    }

    // Se um firm_id foi fornecido no body, usar para todos
    if (forcedFirmId) {
      if (dry_run) {
        return Response.json({
          success: true,
          dry_run: true,
          would_update: withoutFirm.length,
          workshops: withoutFirm.map(w => ({ id: w.id, name: w.name }))
        });
      }

      let updated = 0;
      const errors = [];
      for (const ws of withoutFirm) {
        try {
          await base44.asServiceRole.entities.Workshop.update(ws.id, { consulting_firm_id: forcedFirmId });
          updated++;
        } catch (e) {
          errors.push({ id: ws.id, name: ws.name, error: e.message });
        }
      }
      return Response.json({ success: true, updated, errors, total_without_firm: withoutFirm.length });
    }

    // Modo automático: tentar descobrir o consulting_firm_id via owner ou admin
    // Buscar o consulting_firm_id do usuário admin que está executando
    const adminFirmId = user.data?.consulting_firm_id;
    if (!adminFirmId) {
      return Response.json({
        error: 'Seu usuário não tem consulting_firm_id. Forneça { "consulting_firm_id": "xxx" } no body.',
        workshops_without_firm: withoutFirm.length,
        sample: withoutFirm.slice(0, 5).map(w => ({ id: w.id, name: w.name }))
      }, { status: 400 });
    }

    if (dry_run) {
      return Response.json({
        success: true,
        dry_run: true,
        would_update: withoutFirm.length,
        firm_id_to_use: adminFirmId,
        workshops: withoutFirm.map(w => ({ id: w.id, name: w.name }))
      });
    }

    let updated = 0;
    const errors = [];
    for (const ws of withoutFirm) {
      try {
        await base44.asServiceRole.entities.Workshop.update(ws.id, { consulting_firm_id: adminFirmId });
        updated++;
      } catch (e) {
        errors.push({ id: ws.id, name: ws.name, error: e.message });
      }
    }

    console.log(`[repairWorkshopConsultingFirmId] Atualizado ${updated}/${withoutFirm.length} workshops`);
    return Response.json({
      success: true,
      updated,
      errors,
      total_without_firm: withoutFirm.length,
      consulting_firm_id_used: adminFirmId
    });

  } catch (error) {
    console.error('[repairWorkshopConsultingFirmId]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
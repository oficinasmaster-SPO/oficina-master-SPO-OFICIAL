import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dry_run = body.dry_run !== false; // default true (seguro)

  // 1. Buscar todos os FollowUpReminders (não concluídos e concluídos)
  const allReminders = await base44.asServiceRole.entities.FollowUpReminder.list('-created_date', 1000);

  // 2. Separar os que têm ata_id dos que não têm
  const semAtaId = allReminders.filter(r => !r.ata_id);
  const comAtaId = allReminders.filter(r => !!r.ata_id);

  // 3. Buscar as ATAs que existem de fato no banco
  const ataIdsUnicos = [...new Set(comAtaId.map(r => r.ata_id))];
  
  const atasExistentes = new Set();
  const BATCH = 50;
  for (let i = 0; i < ataIdsUnicos.length; i += BATCH) {
    const batch = ataIdsUnicos.slice(i, i + BATCH);
    const atas = await base44.asServiceRole.entities.MeetingMinutes.filter(
      { id: { $in: batch } },
      '-meeting_date',
      BATCH
    );
    atas.forEach(a => atasExistentes.add(a.id));
  }

  // 4. Órfãos: têm ata_id mas a ATA não existe mais
  const orfaos = comAtaId.filter(r => !atasExistentes.has(r.ata_id));

  // 5. Lista final para deletar: sem ATA + órfãos
  const paraRemover = [...semAtaId, ...orfaos];

  // 6. Agrupar por cliente para o relatório
  const porCliente = {};
  paraRemover.forEach(r => {
    const key = r.workshop_name || r.workshop_id || 'Sem cliente';
    if (!porCliente[key]) porCliente[key] = { workshop_name: key, workshop_id: r.workshop_id, count: 0, ids: [], motivos: [] };
    porCliente[key].count++;
    porCliente[key].ids.push(r.id);
    const motivo = !r.ata_id ? 'sem_ata_id' : 'ata_removida';
    if (!porCliente[key].motivos.includes(motivo)) porCliente[key].motivos.push(motivo);
  });

  const relatorio = {
    dry_run,
    total_reminders_no_banco: allReminders.length,
    total_sem_ata_id: semAtaId.length,
    total_orfaos_ata_removida: orfaos.length,
    total_a_remover: paraRemover.length,
    por_cliente: Object.values(porCliente).sort((a, b) => b.count - a.count),
  };

  if (dry_run) {
    return Response.json({
      ...relatorio,
      message: `DRY RUN — nada foi deletado. ${paraRemover.length} reminders seriam removidos. Rode com dry_run=false para confirmar.`,
    });
  }

  // 7. Deletar em lotes
  let deletados = 0;
  const erros = [];
  for (const r of paraRemover) {
    try {
      await base44.asServiceRole.entities.FollowUpReminder.delete(r.id);
      deletados++;
    } catch (e) {
      erros.push({ id: r.id, error: e.message });
    }
  }

  return Response.json({
    ...relatorio,
    deletados,
    erros,
    message: `Limpeza concluída. ${deletados} reminders removidos. ${erros.length} erros.`,
  });
});
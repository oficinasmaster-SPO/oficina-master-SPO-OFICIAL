import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Server-side job to mark overdue atendimentos as "atrasado".
 * Processes ALL overdue records (no limit), in a single batch.
 * Called once when ControleAceleracao page loads.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Statuses that should NOT be auto-marked
    const finalStatuses = ['realizado', 'participando', 'atrasado', 'reagendado', 'cancelado', 'faltou', 'desmarcou'];

    // Fetch all non-final atendimentos
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      {},
      '-data_agendada',
      5000 // Aumentado para garantir que todos os atendimentos antigos sejam avaliados
    );

    const now = new Date();
    const idsToUpdate = [];

    for (const a of atendimentos) {
      if (finalStatuses.includes(a.status)) continue;
      const dataAgendada = new Date(a.data_agendada);
      if (now > dataAgendada) {
        idsToUpdate.push(a.id);
      }
    }

    // Update all overdue records
    let updated = 0;
    for (const id of idsToUpdate) {
      await base44.asServiceRole.entities.ConsultoriaAtendimento.update(id, { status: 'atrasado' });
      updated++;
    }

    return Response.json({ success: true, updated, total_checked: atendimentos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
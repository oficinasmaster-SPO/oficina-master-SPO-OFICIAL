import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * S3-02 — backfillLimparFollowUpsLegados
 *
 * Limpeza de resíduos legados em FollowUpReminder:
 *
 * (a) FUs abertos com reminder_date em sáb/dom → shiftToBusinessDay (sexta anterior)
 * (b) FUs abertos com origin_type = tarefa_backlog ou pedido_interno → soft close
 *     (is_completed: true, completed_at: now, motivo no notes)
 *
 * Idempotente: pode ser executada múltiplas vezes sem efeito duplicado.
 * Parâmetro dry_run=true simula sem gravar.
 */

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
    const { dry_run = false } = await req.json().catch(() => ({}));

    console.log(`[BACKFILL] Iniciando — dry_run: ${dry_run}`);

    // Buscar todos os FUs abertos
    const todos = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { is_completed: false }, 'reminder_date', 5000
    );

    console.log(`[BACKFILL] Total FUs abertos: ${todos.length}`);

    const report = {
      total: todos.length,
      shiftedWeekend: [],   // (a) datas corrigidas
      softClosed: [],       // (b) legados fechados
      skipped: 0,
      errors: [],
    };

    const now = new Date().toISOString();

    for (const fu of todos) {
      try {
        // ── (b) Soft close de FUs legados ─────────────────────────────────
        if (['tarefa_backlog', 'pedido_interno'].includes(fu.origin_type)) {
          if (!dry_run) {
            await base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
              is_completed: true,
              completed_at: now,
              notes: `[BACKFILL S3-02] Encerrado automaticamente — origin_type ${fu.origin_type} desativado.`,
            });
          }
          report.softClosed.push({
            id: fu.id,
            workshop_name: fu.workshop_name,
            origin_type: fu.origin_type,
            reminder_date: fu.reminder_date,
          });
          continue; // não precisa checar fim de semana se está sendo fechado
        }

        // ── (a) Shift de datas em fim de semana ───────────────────────────
        if (fu.reminder_date) {
          const shifted = shiftToBusinessDay(fu.reminder_date);
          if (shifted !== fu.reminder_date) {
            if (!dry_run) {
              await base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
                reminder_date: shifted,
                notes: `${fu.notes || ''} [BACKFILL S3-02] Data ajustada de ${fu.reminder_date} (fim de semana) para ${shifted}.`.trim(),
              });
            }
            report.shiftedWeekend.push({
              id: fu.id,
              workshop_name: fu.workshop_name,
              origin_type: fu.origin_type,
              reminder_date_antiga: fu.reminder_date,
              reminder_date_nova: shifted,
            });
            continue;
          }
        }

        report.skipped++;
      } catch (e) {
        console.error(`[BACKFILL] Erro no FU ${fu.id}:`, e.message);
        report.errors.push({ id: fu.id, error: e.message });
      }
    }

    console.log(`[BACKFILL] Concluído:`, {
      shiftedWeekend: report.shiftedWeekend.length,
      softClosed: report.softClosed.length,
      skipped: report.skipped,
      errors: report.errors.length,
    });

    return Response.json({
      ok: true,
      dry_run,
      timestamp: now,
      summary: {
        total: report.total,
        datas_corrigidas: report.shiftedWeekend.length,
        legados_fechados: report.softClosed.length,
        sem_mudanca: report.skipped,
        erros: report.errors.length,
      },
      detail: report,
    });

  } catch (error) {
    console.error('[BACKFILL] Erro crítico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

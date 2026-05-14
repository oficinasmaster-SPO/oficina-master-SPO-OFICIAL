import { useMemo } from "react";

/**
 * Hook centralizado de numeração de follow-ups.
 *
 * Fonte da verdade: FollowUpReminder (todos, concluídos ou não).
 * Ordenação: created_date ASC por workshop → #1, #2, #3...
 *
 * @param {Array} reminders - todos os FollowUpReminder carregados
 * @returns {{
 *   seqByReminderId: Object,    // reminder.id → número sequencial (#1, #2...)
 *   statsByWorkshopId: Object,  // workshop_id → { total, concluidos, pendentes }
 * }}
 */
export function useFollowUpSequence(reminders = []) {
  return useMemo(() => {
    const byWorkshop = {};

    // Agrupa todos os reminders por workshop
    reminders.forEach(r => {
      const wid = r.workshop_id;
      if (!wid) return;
      if (!byWorkshop[wid]) byWorkshop[wid] = [];
      byWorkshop[wid].push(r);
    });

    const seqByReminderId = {};
    const statsByWorkshopId = {};

    Object.entries(byWorkshop).forEach(([wid, list]) => {
      // Ordena por created_date ASC (fallback: reminder_date ASC)
      const sorted = list.slice().sort((a, b) => {
        const da = a.created_date || a.reminder_date || "";
        const db = b.created_date || b.reminder_date || "";
        return da.localeCompare(db);
      });

      // Atribui sequência #1, #2, #3...
      sorted.forEach((r, idx) => {
        seqByReminderId[r.id] = idx + 1;
      });

      // Estatísticas por workshop
      const total = sorted.length;
      const concluidos = sorted.filter(r => r.is_completed).length;
      statsByWorkshopId[wid] = {
        total,
        concluidos,
        pendentes: total - concluidos,
      };
    });

    return { seqByReminderId, statsByWorkshopId };
  }, [reminders]);
}
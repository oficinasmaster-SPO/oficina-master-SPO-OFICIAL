import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Cria o próximo FollowUpReminder para um suporte.
 * - atendeu → check-in +7 dias (origin_type: suporte_checkin)
 * - nao_atendeu / aguardando → re-agenda amanhã (mesmo suporte_id)
 * - outros resultados → não cria nada
 *
 * Robustez (auditoria 2026-07-29):
 *  - try/catch com toast.error para falhas silenciosas de RLS/criação.
 *  - fallback de `consulting_firm_id` via `user.data.consulting_firm_id`
 *    (registros antigos podem não ter o campo no followUp).
 *  - retorno { success, reminder, error } mantendo retrocompat (ainda retorna reminder|null).
 *
 * @param {{ followUp: object, resultado: string, user?: object }}
 */
export async function criarProximoSuporteFU({ followUp, resultado, user }) {
  const consultingFirmId =
    followUp?.consulting_firm_id ||
    user?.data?.consulting_firm_id ||
    user?.consulting_firm_id ||
    null;

  const buildPayload = (overrides) => ({
    workshop_id: followUp.workshop_id,
    workshop_name: followUp.workshop_name,
    consultor_id: followUp.consultor_id,
    consultor_nome: followUp.consultor_nome,
    sequence_number: 1,
    reminder_date: new Date().toISOString().split("T")[0],
    is_completed: false,
    consulting_firm_id: consultingFirmId,
    ...overrides,
  });

  try {
    if (resultado === "atendeu") {
      const checkinDate = new Date();
      checkinDate.setDate(checkinDate.getDate() + 7);
      const reminder = await base44.entities.FollowUpReminder.create(
        buildPayload({
          reminder_date: checkinDate.toISOString().split("T")[0],
          origin_type: "suporte_checkin",
          suporte_id: followUp.suporte_id,
          message: `🛟 Check-in pós-suporte — ${followUp.suporte_id || "suporte resolvido"}`,
        })
      );
      return { success: true, reminder, error: null };
    }

    if (resultado === "nao_atendeu" || resultado === "aguardando") {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const reminder = await base44.entities.FollowUpReminder.create(
        buildPayload({
          sequence_number: followUp.sequence_number || 1,
          reminder_date: amanha.toISOString().split("T")[0],
          origin_type: followUp.origin_type,
          suporte_id: followUp.suporte_id,
          message:
            resultado === "aguardando"
              ? `⏳ Aguardando resposta — ${followUp.suporte_id}`
              : `🔁 Retentativa suporte — ${followUp.suporte_id}`,
        })
      );
      return { success: true, reminder, error: null };
    }

    return { success: true, reminder: null, error: null };
  } catch (error) {
    console.error("❌ Falha ao criar próximo follow-up de suporte:", error);
    toast.error("Não foi possível agendar o próximo follow-up de suporte.");
    return { success: false, reminder: null, error };
  }
}
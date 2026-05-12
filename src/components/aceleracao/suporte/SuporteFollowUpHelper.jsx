import { base44 } from "@/api/base44Client";

/**
 * Cria o próximo FollowUpReminder para um suporte.
 * - atendeu → check-in +7 dias (origin_type: suporte_checkin)
 * - nao_atendeu / aguardando → re-agenda amanhã (mesmo suporte_id)
 * - outros resultados → não cria nada
 */
export async function criarProximoSuporteFU({ followUp, resultado }) {
  if (resultado === "atendeu") {
    const checkinDate = new Date();
    checkinDate.setDate(checkinDate.getDate() + 7);
    return await base44.entities.FollowUpReminder.create({
      workshop_id: followUp.workshop_id,
      workshop_name: followUp.workshop_name,
      consultor_id: followUp.consultor_id,
      consultor_nome: followUp.consultor_nome,
      sequence_number: 1,
      reminder_date: checkinDate.toISOString().split('T')[0],
      origin_type: 'suporte_checkin',
      suporte_id: followUp.suporte_id,
      is_completed: false,
      message: `🛟 Check-in pós-suporte — ${followUp.suporte_id || 'suporte resolvido'}`,
      consulting_firm_id: followUp.consulting_firm_id || null,
    });
  }

  if (resultado === "nao_atendeu" || resultado === "aguardando") {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return await base44.entities.FollowUpReminder.create({
      workshop_id: followUp.workshop_id,
      workshop_name: followUp.workshop_name,
      consultor_id: followUp.consultor_id,
      consultor_nome: followUp.consultor_nome,
      sequence_number: followUp.sequence_number || 1,
      reminder_date: amanha.toISOString().split('T')[0],
      origin_type: followUp.origin_type,
      suporte_id: followUp.suporte_id,
      is_completed: false,
      message: resultado === "aguardando"
        ? `⏳ Aguardando resposta — ${followUp.suporte_id}`
        : `🔁 Retentativa suporte — ${followUp.suporte_id}`,
      consulting_firm_id: followUp.consulting_firm_id || null,
    });
  }

  return null;
}
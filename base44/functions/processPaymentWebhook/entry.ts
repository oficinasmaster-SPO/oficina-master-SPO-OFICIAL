import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const gateway = payload.gateway; // "eduzz" ou "hotmart"
    const status = payload.status; // "approved", "cancelled", "refunded", "failed"
    const workshopId = payload.custom_fields?.workshop_id;
    const planName = payload.product?.name;
    
    if (!workshopId) {
      return Response.json({ error: "Workshop ID não informado" }, { status: 400 });
    }

    // Buscar workshop
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
    
    if (status === "approved") {
      // Pagamento aprovado - liberar recursos
      await base44.asServiceRole.entities.Workshop.update(workshopId, {
        planoAtual: planName,
        dataAssinatura: new Date().toISOString(),
        dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 dias
      });

      // Resetar contadores de uso
      await base44.asServiceRole.entities.Workshop.update(workshopId, {
        limitesUtilizados: {
          diagnosticosMes: 0,
          colaboradores: 0,
          filiais: 0
        }
      });

      // Enviar notificação de boas-vindas
      await base44.asServiceRole.entities.Notification.create({
        user_id: workshop.owner_id,
        workshop_id: workshopId,
        type: "config_preferencias",
        title: "Plano ativado com sucesso!",
        message: `Seu plano ${planName} foi ativado. Aproveite todos os recursos!`,
        metadata: { plan: planName }
      });

    } else if (status === "cancelled" || status === "refunded") {
      // Cancelamento ou reembolso - bloquear após período de graça
      await scheduleBlockWorkshop(workshopId, 5); // 5 dias de graça
      
    } else if (status === "failed") {
      // Falha no pagamento - enviar aviso
      await sendPaymentFailureNotification(workshopId, workshop.owner_id);
    }

    return Response.json({ success: true, status: "processed" });
    
  } catch (error) {
    console.error("Erro processando webhook:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function scheduleBlockWorkshop(workshopId, daysDelay) {
  // Agendar bloqueio após X dias
  const blockDate = new Date(Date.now() + daysDelay * 24 * 60 * 60 * 1000);
  
  // Criar tarefa agendada (simplificado)
  console.log(`Workshop ${workshopId} será bloqueado em ${blockDate}`);
}

async function sendPaymentFailureNotification(workshopId, userId) {
  const base44 = createClientFromRequest(req);
  
  await base44.asServiceRole.entities.Notification.create({
    user_id: userId,
    workshop_id: workshopId,
    type: "prazo_hoje",
    title: "Falha no pagamento",
    message: "Não conseguimos processar seu pagamento. Atualize seus dados em até 5 dias para evitar bloqueio.",
    metadata: { urgency: "high" }
  });
}
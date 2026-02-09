import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar workshops com planos ativos
    const workshops = await base44.asServiceRole.entities.Workshop.filter({
      planoAtual: { $ne: "FREE" }
    });

    const today = new Date();
    const results = [];

    for (const workshop of workshops) {
      if (!workshop.dataRenovacao) continue;

      const renewalDate = new Date(workshop.dataRenovacao);
      const daysUntilRenewal = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));

      // Pagamento vencido
      if (daysUntilRenewal < 0) {
        const daysOverdue = Math.abs(daysUntilRenewal);
        
        // Enviar avisos nos primeiros 5 dias
        if (daysOverdue <= 5) {
          await sendPaymentReminder(workshop, daysOverdue);
          results.push({ workshop.name, action: "reminder_sent", daysOverdue });
        }
        
        // Bloquear após 5 dias
        if (daysOverdue > 5) {
          await blockWorkshop(workshop);
          results.push({ workshop.name, action: "blocked", daysOverdue });
        }
      }
      
      // Avisos preventivos (3 dias antes)
      if (daysUntilRenewal > 0 && daysUntilRenewal <= 3) {
        await sendRenewalReminder(workshop, daysUntilRenewal);
        results.push({ workshop.name, action: "renewal_reminder", daysUntilRenewal });
      }
    }

    return Response.json({ 
      success, 
      processed.length,
      results 
    });
    
  } catch (error) {
    console.error("Erro verificando pagamentos:", error);
    return Response.json({ error.message }, { status: 500 });
  }
});

async function sendPaymentReminder(workshop, daysOverdue) {
  const base44 = createClientFromRequest(req);
  
  await base44.asServiceRole.entities.Notification.create({
    user_id.owner_id,
    workshop_id.id,
    type: "prazo_hoje",
    title: `Pagamento em atraso - Dia ${daysOverdue}/5`,
    message: `Seu pagamento está atrasado há ${daysOverdue} dias. Renove agora para evitar bloqueio em ${5 - daysOverdue} dias.`,
    metadata: { daysOverdue, urgency: "high" }
  });

  // Enviar email também
  await base44.asServiceRole.integrations.Core.SendEmail({
    to.owner_id,
    subject: "⚠️ Pagamento em Atraso",
    body: `Seu plano ${workshop.planoAtual} está com pagamento em atraso. Renove em até ${5 - daysOverdue} dias.`
  });
}

async function sendRenewalReminder(workshop, daysUntilRenewal) {
  const base44 = createClientFromRequest(req);
  
  await base44.asServiceRole.entities.Notification.create({
    user_id.owner_id,
    workshop_id.id,
    type: "prazo_proximo",
    title: "Renovação próxima",
    message: `Seu plano ${workshop.planoAtual} vence em ${daysUntilRenewal} dias. Garanta acesso contínuo!`,
    metadata: { daysUntilRenewal }
  });
}

async function blockWorkshop(workshop) {
  const base44 = createClientFromRequest(req);
  
  // Downgrade para FREE
  await base44.asServiceRole.entities.Workshop.update(workshop.id, {
    planoAtual: "FREE",
    status: "inativo"
  });

  // Notificar
  await base44.asServiceRole.entities.Notification.create({
    user_id.owner_id,
    workshop_id.id,
    type: "processo_atrasado",
    title: "Acesso bloqueado",
    message: "Seu acesso foi bloqueado por falta de pagamento. Regularize para reativar.",
    metadata: { blocked }
  });
}

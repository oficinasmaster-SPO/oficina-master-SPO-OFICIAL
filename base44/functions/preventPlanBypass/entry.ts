import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const processedEvents = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of processedEvents.entries()) {
        if (now - timestamp > CLEANUP_INTERVAL) {
            processedEvents.delete(id);
        }
    }
}, CLEANUP_INTERVAL);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { event, data, old_data, changed_fields } = payload;

    const eventId = event?.id;
    if (eventId) {
        if (processedEvents.has(eventId)) {
            return Response.json({ success: true, reason: 'event already processed' });
        }
        processedEvents.set(eventId, Date.now());
    }

    // Se for criação, não temos old_data para reverter plano, mas um Workshop novo começa como 'trial' ou 'free'.
    // O foco aqui é previnir *updates* indevidos em campos de faturamento.
    if (event.type !== 'update' || !old_data) {
        return Response.json({ success: true, reason: 'not update' });
    }

    const billingFields = ['planId', 'planStatus', 'planoAtual', 'trialEndsAt', 'billingCycleStart', 'billingCycleEnd', 'dataAssinatura', 'dataRenovacao', 'limitesUtilizados'];
    // billing_update_token e billing_secure_hash NÃO devem estar nessa lista — são campos de controle interno
    
    const changedBillingFields = changed_fields.filter(f => billingFields.includes(f));

    if (changedBillingFields.length > 0 && data.billing_update_token === "" && !old_data.billing_update_token) {
        return Response.json({ success: true, reason: 'token cleanup event, skipping' });
    }

    if (changedBillingFields.length > 0) {
        const webhookToken = Deno.env.get("KIWIFY_CLIENT_SECRET");
        
        // Verifica se a atualização possui o token secreto
        if (!data.billing_update_token || data.billing_update_token !== webhookToken) {
            console.warn(`[SECURITY] Tentativa de alteração não autorizada nos campos de faturamento do Workshop ${data.id}. Revertendo...`);
            
            // Reverter as mudanças nos campos de faturamento para o valor antigo
            const revertPayload = {};
            for (const field of changedBillingFields) {
                revertPayload[field] = old_data[field];
            }
            
            const base44 = createClientFromRequest(req);
            await base44.asServiceRole.entities.Workshop.update(data.id, revertPayload);
            
            // Registrar auditoria
            await base44.asServiceRole.entities.SecurityLog.create({
                user_id: "system",
                tenant_id: data.id,
                endpoint: "EntityAutomation: revertPlanBypass",
                status: "403",
                event_type: "suspicious_access",
                details: JSON.stringify({ 
                    message: "Bypass attempt on billing fields",
                    changed_fields: changedBillingFields 
                })
            });
            
            return Response.json({ success: false, reason: 'reverted unauthorized billing update' });
        } else {
            // Atualização autorizada. Limpar o token do banco para não ficar persistido.
            // Fazemos isso de forma assíncrona sem await para não bloquear a resposta.
            const base44 = createClientFromRequest(req);
            base44.asServiceRole.entities.Workshop.update(data.id, { billing_update_token: "" }).catch(() => {});
            return Response.json({ success: true, reason: 'authorized update - token cleared' });
        }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Erro no preventPlanBypass:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
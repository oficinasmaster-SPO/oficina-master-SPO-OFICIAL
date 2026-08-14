import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * S2 — Webhook N8N Relay
 *
 * Gateway central: recebe o payload de entity automations do Base44
 * (formato { event, data, old_data }) e repassa via POST para o webhook
 * do n8n (Rafa/SDR e demais fluxos), envelopado com metadados de rota.
 *
 * Config necessária (Painel Base44 → Settings → Environment Variables):
 *   N8N_WEBHOOK_URL    — URL de produção do webhook node no n8n (obrigatória)
 *   N8N_WEBHOOK_SECRET — token fixo enviado no header x-webhook-secret (opcional,
 *                        mas recomendado; deve bater com o Header Auth configurado
 *                        no Webhook node do n8n)
 *
 * Uso: apontar as entity automations desejadas (ex: Notification, Workshop)
 * para esta function no painel do Base44. No n8n, o primeiro node do
 * workflow faz um switch pelo campo `entity` do envelope para rotear
 * cada tipo de evento ao fluxo correspondente.
 *
 * Falha no n8n NUNCA derruba a automation do Base44 — sempre retorna 200
 * com o status reportado, mesmo em erro de rede/timeout.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload || {};

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
    const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET');

    if (!N8N_WEBHOOK_URL) {
      console.error('webhookN8nRelay: N8N_WEBHOOK_URL não configurada — evento descartado');
      // Retorna ok:true para NÃO quebrar a automation do Base44 por falta de config.
      return Response.json({ ok: true, skipped: true, reason: 'N8N_WEBHOOK_URL não configurada' });
    }

    const envelope = {
      source: 'spo_base44',
      entity: event?.entity_name || 'unknown',
      event_type: event?.type || 'unknown',
      entity_id: data?.id || event?.entity_id || null,
      data: data || null,
      old_data: old_data || null,
      timestamp: new Date().toISOString(),
    };

    // Timeout defensivo — não deixa a automation do Base44 pendurada
    // esperando o n8n indefinidamente.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(N8N_WEBHOOK_SECRET ? { 'x-webhook-secret': N8N_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return Response.json({
        ok: true,
        relayed: true,
        n8n_status: response.status,
        entity: envelope.entity,
        event_type: envelope.event_type,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('webhookN8nRelay: falha ao enviar para n8n:', fetchError.message);
      // Não propaga erro 500 — evita que a automation do Base44 seja
      // marcada como falha por instabilidade momentânea do n8n.
      return Response.json({
        ok: true,
        relayed: false,
        error: fetchError.message,
        entity: envelope.entity,
        event_type: envelope.event_type,
      });
    }
  } catch (error) {
    console.error('webhookN8nRelay: erro inesperado:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const webhookData = await req.json();
    
    console.log('ClickSign Webhook received:', webhookData);

    const { event, envelope } = webhookData;

    if (!event || !envelope) {
      return Response.json({ 
        error: 'Dados do webhook incompletos' 
      }, { status: 400 });
    }

    // Processar evento baseado no tipo
    switch (event.name) {
      case 'envelope.signed':
        // Envelope totalmente assinado
        await handleEnvelopeSigned(envelope);
        break;
      
      case 'envelope.closed':
        // Envelope fechado/concluído
        await handleEnvelopeClosed(envelope);
        break;
      
      case 'signer.signed':
        // Um signatário assinou
        await handleSignerSigned(webhookData);
        break;
      
      case 'signer.refused':
        // Um signatário recusou
        await handleSignerRefused(webhookData);
        break;
      
      case 'envelope.expired':
        // Envelope expirou
        await handleEnvelopeExpired(envelope);
        break;
      
      default:
        console.log('Evento não mapeado:', event.name);
    }

    return Response.json({ 
      success: true,
      message: 'Webhook processado com sucesso'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function handleEnvelopeSigned(envelope) {
  console.log('Envelope assinado por todos:', envelope.key);
  // Implementar lógica: notificar usuários, atualizar status, etc.
}

async function handleEnvelopeClosed(envelope) {
  console.log('Envelope fechado:', envelope.key);
  // Implementar lógica: finalizar processo, arquivar documento
}

async function handleSignerSigned(data) {
  console.log('Signatário assinou:', data.signer?.email);
  // Implementar lógica: notificar próximo signatário se sequencial
}

async function handleSignerRefused(data) {
  console.log('Signatário recusou:', data.signer?.email);
  // Implementar lógica: notificar responsáveis, cancelar processo
}

async function handleEnvelopeExpired(envelope) {
  console.log('Envelope expirou:', envelope.key);
  // Implementar lógica: notificar sobre expiração
}
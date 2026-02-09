/**
 * Cria ou atualiza assinatura de plano
 * 
 * IMPORTANTE função requer Backend Functions habilitado
 * Habilite em → Settings → Backend Functions
 */

import { base44 } from '@/api/base44Client';
import processPayment from './processPayment';

export default async function createSubscription({ 
  workshopId, 
  planId,
  paymentData,
  userId 
}) {
  try {
    // Buscar workshop e plano
    const workshop = await base44.entities.Workshop.filter({ id });
    const plan = await base44.entities.Plan.filter({ id });

    if (!workshop[0] || !plan[0]) {
      throw new Error('Workshop ou Plano não encontrado');
    }

    const workshopData = workshop[0];
    const planData = plan[0];

    // Se for plano gratuito, apenas atualiza
    if (planData.preco === 0) {
      await base44.entities.Workshop.update(workshopId, {
        planoAtual.nome,
        dataAssinatura Date().toISOString(),
        dataRenovacao Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        limitesUtilizados: {
          diagnosticosMes: 0,
          colaboradores: 0,
          filiais: 0
        }
      });

      return {
        success,
        message: 'Plano gratuito ativado com sucesso',
        workshop
      };
    }

    // Processar pagamento via gateway
    const paymentResult = await processPayment({
      paymentData,
      plan,
      workshop
    });

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Erro ao processar pagamento');
    }

    // Atualizar workshop com novo plano
    await base44.entities.Workshop.update(workshopId, {
      planoAtual.nome,
      dataAssinatura Date().toISOString(),
      dataRenovacao Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      limitesUtilizados: {
        diagnosticosMes: 0,
        colaboradores.limitesUtilizados?.colaboradores || 0,
        filiais.limitesUtilizados?.filiais || 0
      }
    });

    // Criar registro de pagamento
    await base44.entities.PaymentHistory.create({
      workshop_id,
      plan_name.nome,
      amount.preco,
      payment_method.paymentMethod,
      payment_status.status === 'active' || paymentResult.status === 'approved' ? 'approved' : 'pending',
      transaction_id.transactionId,
      gateway.gateway,
      payment_date Date().toISOString(),
      billing_period_start Date().toISOString(),
      billing_period_end Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata.metadata
    });

    // Enviar email de confirmação
    await sendConfirmationEmail({
      email.owner_email,
      planName.nome,
      amount.preco
    });

    return {
      success,
      message: 'Assinatura criada com sucesso',
      transactionId.transactionId,
      workshop
    };

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    
    return {
      success,
      error.message
    };
  }
}

async function sendConfirmationEmail({ email, planName, amount }) {
  try {
    await base44.integrations.Core.SendEmail({
      to,
      subject: `Assinatura Confirmada - Plano ${planName}`,
      body: `
        Assinatura Confirmada!</h2>
        Olá! Sua assinatura do Plano ${planName}</strong> foi confirmada com sucesso.</p>
        Valor:</strong> R$ ${amount.toFixed(2)}/mês</p>
        Obrigado por escolher a Oficinas Master!</p>
        Acesse sua conta para começar a usar todos os recursos do seu plano.</p>
      `
    });
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
  }
}

/**
 * Cria ou atualiza assinatura de plano
 *
 * IMPORTANTE: Esta função requer Backend Functions habilitado
 * Habilite em: Dashboard → Settings → Backend Functions
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, planId, paymentData, userId } = await req.json();

    // Buscar workshop e plano
    const workshop = await base44.entities.Workshop.filter({ id: workshopId });
    const plan = await base44.entities.Plan.filter({ id: planId });

    if (!workshop[0] || !plan[0]) {
      throw new Error('Workshop ou Plano não encontrado');
    }

    const workshopData = workshop[0];
    const planData = plan[0];

    // Se for plano gratuito, apenas atualiza
    if (planData.preco === 0) {
      await base44.entities.Workshop.update(workshopId, {
        planoAtual: planData.nome,
        dataAssinatura: new Date().toISOString(),
        dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        limitesUtilizados: {
          diagnosticosMes: 0,
          colaboradores: 0,
          filiais: 0
        }
      });

      return Response.json({
        success: true,
        message: 'Plano gratuito ativado com sucesso',
        workshop: workshopData
      });
    }

    // Processar pagamento via gateway (invoca a função processPayment)
    const invokeRes = await base44.functions.invoke('processPayment', {
      paymentData,
      plan: planData,
      workshop: workshopData
    });
    const paymentResult = invokeRes?.data ?? invokeRes;

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Erro ao processar pagamento');
    }

    // Atualizar workshop com novo plano
    await base44.entities.Workshop.update(workshopId, {
      planoAtual: planData.nome,
      dataAssinatura: new Date().toISOString(),
      dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      limitesUtilizados: {
        diagnosticosMes: 0,
        colaboradores: workshopData.limitesUtilizados?.colaboradores || 0,
        filiais: workshopData.limitesUtilizados?.filiais || 0
      }
    });

    // Criar registro de pagamento
    await base44.entities.PaymentHistory.create({
      workshop_id: workshopId,
      plan_name: planData.nome,
      amount: planData.preco,
      payment_method: paymentData.paymentMethod,
      payment_status: paymentResult.status === 'active' || paymentResult.status === 'approved' ? 'approved' : 'pending',
      transaction_id: paymentResult.transactionId,
      gateway: paymentData.gateway,
      payment_date: new Date().toISOString(),
      billing_period_start: new Date().toISOString(),
      billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: paymentResult.metadata
    });

    // Enviar email de confirmação
    await sendConfirmationEmail(base44, {
      email: workshopData.owner_email,
      planName: planData.nome,
      amount: planData.preco
    });

    return Response.json({
      success: true,
      message: 'Assinatura criada com sucesso',
      transactionId: paymentResult.transactionId,
      workshop: workshopData
    });

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function sendConfirmationEmail(base44, { email, planName, amount }) {
  try {
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Assinatura Confirmada - Plano ${planName}`,
      body: `
        <h2>Assinatura Confirmada!</h2>
        <p>Olá! Sua assinatura do <strong>Plano ${planName}</strong> foi confirmada com sucesso.</p>
        <p><strong>Valor:</strong> R$ ${amount.toFixed(2)}/mês</p>
        <p>Obrigado por escolher a Oficinas Master!</p>
        <p>Acesse sua conta para começar a usar todos os recursos do seu plano.</p>
      `
    });
  } catch (error) {
    console.error('Erro ao enviar email de confirmação:', error);
  }
}
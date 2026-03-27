import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Verifica o uso de créditos de integração e dispara alertas proativos
 * quando atinge 70%, 90% ou 100% do limite
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { credits_used, credits_limit, user_tier } = body;

    if (typeof credits_used !== 'number' || typeof credits_limit !== 'number') {
      return Response.json({ 
        error: 'Missing required fields: credits_used, credits_limit' 
      }, { status: 400 });
    }

    const percentage = (credits_used / credits_limit) * 100;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Determinar tipo de alerta
    let alertType = null;
    if (percentage >= 100) {
      alertType = 'limit_100';
    } else if (percentage >= 90) {
      alertType = 'critical_90';
    } else if (percentage >= 70) {
      alertType = 'warning_70';
    }

    if (!alertType) {
      return Response.json({ 
        success: true, 
        message: 'No alert needed', 
        percentage: percentage.toFixed(1) 
      });
    }

    // Verificar se já existe alerta deste tipo neste mês
    const existingAlerts = await base44.asServiceRole.entities.IntegrationCreditAlert.filter({
      user_id: user.id,
      alert_type: alertType,
      month_year: currentMonth
    });

    if (existingAlerts && existingAlerts.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Alert already sent this month',
        alert_type: alertType
      });
    }

    // Criar registro do alerta
    const alertData = {
      user_id: user.id,
      workshop_id: user.workshop_id || null,
      alert_type: alertType,
      credits_used,
      credits_limit,
      percentage: Math.round(percentage),
      user_tier: user_tier || 'unknown',
      email_sent: false,
      in_app_sent: false,
      month_year: currentMonth
    };

    const alert = await base44.asServiceRole.entities.IntegrationCreditAlert.create(alertData);

    // Criar notificação in-app
    const notificationMessages = {
      warning_70: {
        title: '⚠️ 70% dos créditos de integração utilizados',
        message: `Você já usou ${credits_used} de ${credits_limit} créditos de integração este mês. Considere fazer upgrade do seu plano para evitar interrupções.`
      },
      critical_90: {
        title: '🔴 90% dos créditos de integração utilizados',
        message: `Atenção! Você usou ${credits_used} de ${credits_limit} créditos. Faça upgrade agora para continuar usando as integrações sem interrupção.`
      },
      limit_100: {
        title: '🚫 Limite de créditos de integração atingido',
        message: `Você atingiu o limite de ${credits_limit} créditos de integração. Algumas funcionalidades podem estar indisponíveis. Faça upgrade do seu plano.`
      }
    };

    const notifContent = notificationMessages[alertType];

    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id: user.id,
        type: alertType === 'limit_100' ? 'atrasada' : 'prazo_proximo',
        title: notifContent.title,
        message: notifContent.message,
        is_read: false
      });

      // Atualizar flag de notificação in-app
      await base44.asServiceRole.entities.IntegrationCreditAlert.update(alert.id, {
        in_app_sent: true
      });
    } catch (notifError) {
      console.error('Error creating in-app notification:', notifError);
    }

    // Enviar e-mail
    const emailSubjects = {
      warning_70: '⚠️ Alerta: 70% dos créditos de integração utilizados',
      critical_90: '🔴 Urgente: 90% dos créditos de integração utilizados',
      limit_100: '🚫 Limite de créditos de integração atingido'
    };

    const emailBody = `
Olá ${user.full_name || 'Usuário'},

${notifContent.message}

📊 Status atual:
- Créditos usados: ${credits_used}
- Limite do plano: ${credits_limit}
- Percentual: ${Math.round(percentage)}%
- Plano atual: ${user_tier || 'Não identificado'}

🚀 Para fazer upgrade do seu plano:
Acesse: Configurações > Planos

📋 Para verificar o diagnóstico completo:
Acesse: Administração > Diagnóstico de Plano

--
Equipe Oficinas Master
    `.trim();

    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: emailSubjects[alertType],
        body: emailBody
      });

      // Atualizar flag de e-mail enviado
      await base44.asServiceRole.entities.IntegrationCreditAlert.update(alert.id, {
        email_sent: true
      });
    } catch (emailError) {
      console.error('Error sending email (may be due to credit limit):', emailError);
    }

    return Response.json({
      success: true,
      alert_created: true,
      alert_type: alertType,
      percentage: Math.round(percentage),
      credits_used,
      credits_limit
    });

  } catch (error) {
    console.error('Error in checkIntegrationCredits:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});
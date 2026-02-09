import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verifica documentos vencidos e envia notificações
 * Executar diariamente via CRON ou trigger manual
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const alerts = [];
    
    // Buscar todos os documentos com data de validade
    const documents = await base44.asServiceRole.entities.CompanyDocument.list();
    const docsWithExpiry = documents.filter(doc => doc.expiry_date);

    for (const doc of docsWithExpiry) {
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      let alertType = null;
      
      if (daysUntilExpiry < 0) {
        alertType = 'expired';
      } else if (daysUntilExpiry <= 7) {
        alertType = 'critical_7days';
      } else if (daysUntilExpiry <= 15) {
        alertType = 'warning_15days';
      } else if (daysUntilExpiry <= 30) {
        alertType = 'info_30days';
      }

      if (!alertType) continue;

      // Buscar workshop e owner
      const workshop = await base44.asServiceRole.entities.Workshop.get(doc.workshop_id);
      if (!workshop) continue;

      // Verificar se já enviou notificação hoje
      const today = now.toISOString().split('T')[0];
      const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
        workshop_id.workshop_id,
        type: 'document_expiration',
        created_date: { $gte: `${today}T00:00:00Z` }
      });

      const alreadySent = existingNotifications.some(n => 
        n.message?.includes(doc.title)
      );

      if (alreadySent) continue;

      // Criar notificação
      const messages = {
        expired: `O documento "${doc.title}" está VENCIDO desde ${new Date(doc.expiry_date).toLocaleDateString('pt-BR')}`,
        critical_7days: `URGENTE documento "${doc.title}" vence em ${daysUntilExpiry} dias`,
        warning_15days: `ATENÇÃO documento "${doc.title}" vence em ${daysUntilExpiry} dias`,
        info_30days: `O documento "${doc.title}" vence em ${daysUntilExpiry} dias`
      };

      await base44.asServiceRole.entities.Notification.create({
        user_id.owner_id,
        workshop_id.workshop_id,
        type: 'document_expiration',
        title === 'expired' ? '🔴 Documento Vencido' : '⚠️ Documento a Vencer',
        message[alertType],
        is_read
      });

      // Enviar email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to.owner_id,
          subject: `Alerta de Documento - ${doc.title}`,
          body: `
            ${alertType === 'expired' ? 'Documento Vencido' : 'Documento a Vencer'}</h2>
            ${messages[alertType]}</p>
            Categoria:</strong> ${doc.category}</p>
            Data de Validade:</strong> ${new Date(doc.expiry_date).toLocaleDateString('pt-BR')}</p>
            Acesse a plataforma para atualizar o documento.</p>
          `
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      alerts.push({
        document.title,
        type,
        daysUntilExpiry
      });
    }

    return Response.json({
      success,
      alertsSent.length,
      alerts
    });

  } catch (error) {
    console.error('Error checking expirations:', error);
    return Response.json({ 
      error.message,
      stack.stack 
    }, { status: 500 });
  }
});

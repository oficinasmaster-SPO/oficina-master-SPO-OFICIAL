import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, subDays } from 'npm-fns@3.6.0';
import { ptBR } from 'npm-fns@3.6.0/locale';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todas com resumo semanal ativo
    const preferences = await base44.asServiceRole.entities.DocumentNotificationPreference.filter({
      weekly_summary_enabled,
      email_notifications
    });

    const today = new Date();
    const dayOfWeek = today.getDay();
    const currentDay = dayOfWeek === 1 ? 'monday'  === 5 ? 'friday' ;

    if (!currentDay) {
      return Response.json({ message: 'Não é dia de envio de resumo' });
    }

    let sent = 0;

    for (const pref of preferences) {
      if (pref.weekly_summary_day !== currentDay) continue;

      try {
        const user = await base44.asServiceRole.entities.User.get(pref.user_id);
        const workshop = await base44.asServiceRole.entities.Workshop.get(pref.workshop_id);

        const weekStart = subDays(today, 7);
        const documents = await base44.asServiceRole.entities.CompanyDocument.filter({
          workshop_id.workshop_id
        });

        const newDocs = documents.filter(d => new Date(d.created_date) >= weekStart);
        const expiringSoon = documents.filter(d => {
          if (!d.next_review_date) return false;
          const daysUntil = Math.floor((new Date(d.next_review_date) - today) / (1000 * 60 * 60 * 24));
          return daysUntil > 0 && daysUntil <= 30;
        });
        const highImpact = documents.filter(d => d.legal_impact === 'alto');

        const emailBody = `
          Resumo Semanal - ${workshop.name}</h2>
          Olá ${user.full_name},</p>
          
          📊 Resumo da Semana</h3>
          
            ${newDocs.length}</strong> novos documentos adicionados</li>
            ${expiringSoon.length}</strong> documentos vencem nos próximos 30 dias</li>
            ${highImpact.length}</strong> documentos de alto impacto jurídico</li>
          </ul>

          ${newDocs.length > 0 ? `
            📄 Novos Documentos</h3>
            
              ${newDocs.map(d => `${d.title} (${d.category})</li>`).join('')}
            </ul>
          ` : ''}

          ${expiringSoon.length > 0 ? `
            ⏰ Documentos Próximos do Vencimento</h3>
            
              ${expiringSoon.map(d => `
                ${d.title} - Vence em ${format(new Date(d.next_review_date), 'dd/MM/yyyy')}</li>
              `).join('')}
            </ul>
          ` : ''}

          Acesse a plataforma para mais detalhes.</p>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to.email,
          subject: `Resumo Semanal - Documentos | ${workshop.name}`,
          body
        });

        sent++;
      } catch (error) {
        console.error(`Erro ao enviar resumo para ${pref.user_id}:`, error);
      }
    }

    return Response.json({ 
      message: 'Resumos enviados com sucesso',
      sent_count 
    });
  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});

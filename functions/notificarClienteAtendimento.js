import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id é obrigatório' }, { status: 400 });
    }

    // Buscar o atendimento
    const atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.get(atendimento_id);
    
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // Buscar a oficina cliente
    const workshop = await base44.asServiceRole.entities.Workshop.get(atendimento.workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // Buscar owner da oficina para pegar email
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      workshop_id.id,
      owner_id.owner_id 
    });
    
    const ownerEmployee = employees && employees.length > 0 ? employees[0] ;
    const emailDestino = ownerEmployee?.email || workshop.owner_id;

    // Criar link de avaliação (usando o ID do atendimento como token)
    const linkAvaliacao = `${Deno.env.get('BASE44_APP_URL') || 'https://oficinasmastergtr.com'}/AvaliarAtendimento?token=${atendimento_id}`;

    // Montar conteúdo do email
    const assunto = `Avalie seu atendimento - ${workshop.name}`;
    const corpo = `
      <div style="font-family, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Atendimento Concluído!</h2>
        
        Olá, ${workshop.name}!</p>
        
        Seu atendimento de ${atendimento.tipo_atendimento?.replace(/_/g, ' ')}</strong> foi concluído.</p>
        
        Data:</strong> ${new Date(atendimento.data_realizada || atendimento.data_agendada).toLocaleDateString('pt-BR')}</p>
        Consultor:</strong> ${atendimento.consultor_nome}</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;">Sua opinião é muito importante para nós!</p>
          <p style="margin: 0;">Por favor, avalie este atendimento:</p>
          
          <a href="${linkAvaliacao}" 
             style="display-block; background: #2563eb; color; padding: 12px 24px; 
                    text-decoration; border-radius: 6px; margin-top: 15px; font-weight;">
            Avaliar Atendimento
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Obrigado por fazer parte do nosso programa de aceleração!
        </p>
      </div>
    `;

    // Enviar email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Oficinas Master - Aceleração',
      to,
      subject,
      body
    });

    // Atualizar atendimento para marcar que notificação foi enviada
    await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento_id, {
      notificacao_enviada
    });

    return Response.json({ 
      success, 
      message: 'Notificação enviada com sucesso',
      email_enviado
    });

  } catch (error) {
    console.error('Erro ao notificar cliente:', error);
    return Response.json({ 
      error: 'Erro ao enviar notificação',
      details.message 
    }, { status: 500 });
  }
});

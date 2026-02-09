import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({ id });
    const atendimento = atendimentos[0];

    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    const workshops = await base44.entities.Workshop.filter({ id.workshop_id });
    const workshop = workshops[0];

    const users = await base44.asServiceRole.entities.User.filter({ id.owner_id });
    const owner = users[0];

    if (!owner?.email) {
      return Response.json({ error: 'Email do cliente não encontrado' }, { status: 400 });
    }

    // Montar corpo do email
    // Buscar ATA associada
    const atas = await base44.entities.MeetingMinutes.filter({ atendimento_id });
    const ata = atas[0];

    // Link para acessar o sistema (cliente faz login e visualiza ATA)
    const appUrl = Deno.env.get('APP_URL') || 'https://oficinasmaster.com';
    const linkSistema = appUrl;

    const emailBody = `
      <div style="font-family, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">📋 Ata de Atendimento - ${atendimento.tipo_atendimento}</h2>
        
        Olá ${owner.full_name || 'Parceiro'}</strong>,</p>
        
        Segue a ata da nossa reunião realizada em ${new Date(atendimento.data_realizada || atendimento.data_agendada).toLocaleDateString('pt-BR')}</strong>.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ⏰ Duração:</strong> ${atendimento.duracao_real_minutos || atendimento.duracao_minutos} minutos</p>
          👥 Participantes:</strong></p>
          
            ${atendimento.participantes?.map(p => `${p.nome} - ${p.cargo}</li>`).join('') || 'Não informado</li>'}
          </ul>
        </div>

        <h3 style="color: #1f2937;">📝 Resumo</h3>
        ${atendimento.ata_ia || atendimento.observacoes_consultor || 'Ata em preparação'}</p>

        <h3 style="color: #1f2937;">🎯 Próximos Passos</h3>
        ${atendimento.proximos_passos || 'A definir'}</p>

        ${atendimento.midias_anexas?.length > 0 ? `
          <h3 style="color: #1f2937;">📎 Anexos</h3>
          
            ${atendimento.midias_anexas.map(m => `<a href="${m.url}">${m.titulo || m.url}</a></li>`).join('')}
          </ul>
        ` : ''}

        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #1e40af;">🔐 Acesse o Sistema:</strong></p>
          <p style="margin: 10px 0 0 0;">
            <a href="${linkSistema}" style="color: #2563eb; font-weight; text-decoration; font-size: 16px;">Acessar Oficinas Master</a>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 13px; color: #1e40af;">
            Faça login com suas credenciais:</strong>
            Email: ${owner.email}
            (Você receberá a senha por email ou contato direto)
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #1e40af;">
            Após fazer login, você visualizará a ATA completa no seu painel.
          </p>
        </div>

        <hr style="margin: 30px 0; border; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          Oficinas Master - Acelerando seu Crescimento
          Em caso de dúvidas, responda este email.
        </p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to.email,
      subject: `Ata de Reunião - ${atendimento.tipo_atendimento}`,
      body
    });

    await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
      ata_enviada_email
    });

    return Response.json({
      success,
      message: 'Ata enviada por email com sucesso'
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});

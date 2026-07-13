import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { sugestao_id, acao, motivo_reprovacao, tipo_final, data_final, hora_final, consultor_id_override, consultor_nome_override } = body;

    if (!sugestao_id || !acao) {
      return Response.json({ error: 'sugestao_id e acao são obrigatórios' }, { status: 400 });
    }

    // Busca a sugestão
    const sugestao = await base44.asServiceRole.entities.SugestaoAgendamento.get(sugestao_id);
    if (!sugestao) return Response.json({ error: 'Sugestão não encontrada' }, { status: 404 });
    if (sugestao.status !== 'pendente') {
      return Response.json({ error: 'Sugestão já foi processada' }, { status: 400 });
    }

    // Validação de tenant (auditoria): aprovar/reprovar exige vínculo com a oficina
    // da sugestão — admin, internal/consultor ou membership ativa no workshop.
    {
      const isAdmin = user.role === 'admin';
      const isInternal = user.user_type === 'internal' || user.data?.user_type === 'internal';
      let autorizado = isAdmin || isInternal ||
        user.workshop_id === sugestao.workshop_id || user.data?.workshop_id === sugestao.workshop_id;
      if (!autorizado) {
        try {
          const ms = await base44.asServiceRole.entities.TenantMembership.filter({
            user_id: user.id, workshop_id: sugestao.workshop_id, status: 'active'
          });
          autorizado = ms && ms.length > 0;
        } catch (_) { /* mantém não autorizado */ }
      }
      if (!autorizado) {
        return Response.json({ error: 'Acesso negado: sem vínculo com a oficina da sugestão.' }, { status: 403 });
      }
    }

    // === REPROVAR ===
    if (acao === 'reprovar') {
      await base44.asServiceRole.entities.SugestaoAgendamento.update(sugestao_id, {
        status: 'reprovado',
        motivo_reprovacao: motivo_reprovacao || 'Sem motivo informado',
      });
      return Response.json({ success: true, acao: 'reprovado' });
    }

    // === APROVAR ===
    if (acao === 'aprovar') {
      const tipoFinal = tipo_final || sugestao.tipo_atendimento_final || sugestao.tipo_atendimento_sugerido;
      const dataFinal = data_final || sugestao.data_final || sugestao.data_sugerida;
      const horaFinal = hora_final || sugestao.hora_final || sugestao.hora_sugerida;
      // Permite trocar consultor no momento da aprovação
      const consultorIdFinal = consultor_id_override || sugestao.consultor_id;
      const consultorNomeFinal = consultor_nome_override || sugestao.consultor_nome;

      // Marca como processando e já persiste o tipo/data/hora escolhidos pelo consultor
      // (garante consistência mesmo se o Google Calendar falhar a seguir)
      await base44.asServiceRole.entities.SugestaoAgendamento.update(sugestao_id, {
        status: 'processando',
        tipo_atendimento_final: tipoFinal,
        data_final: dataFinal,
        hora_final: horaFinal,
        consultor_id: consultorIdFinal,
        consultor_nome: consultorNomeFinal,
      });

      // Monta datetime
      const dataHoraISO = `${dataFinal}T${horaFinal}:00`;

      // 1. Cria ConsultoriaAtendimento
      const novoAtendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.create({
        workshop_id: sugestao.workshop_id,
        consultor_id: consultorIdFinal,
        consultor_nome: consultorNomeFinal,
        tipo_atendimento: tipoFinal,
        data_agendada: dataHoraISO,
        status: 'agendado',
        registro_meta: {
          criado_por_id: user.id,
          criado_por_nome: user.full_name,
          criado_por_cargo: 'admin',
          origem_tela: 'SugestoesAgendamento',
          criado_em: new Date().toISOString(),
        },
      });

      // 2. Marca ContractAttendance original como reagendado (Opção B)
      if (sugestao.contract_attendance_id) {
        await base44.asServiceRole.entities.ContractAttendance.update(
          sugestao.contract_attendance_id,
          {
            status: 'agendado',
            consultoria_atendimento_id: novoAtendimento.id,
            scheduled_date: dataHoraISO,
          }
        );
      }

      // 3. Cria evento Google Calendar
      let googleEventId = null;
      let meetLink = null;
      try {
        const gcalResult = await base44.asServiceRole.functions.invoke('createGoogleMeetEvent', {
          title: `${tipoFinal} - ${sugestao.workshop_name}`,
          description: `Reunião de ${tipoFinal} com ${sugestao.workshop_name}\n\nMotivo: ${sugestao.motivo_urgencia || ''}`,
          startDateTime: dataHoraISO,
          endDateTime: (() => {
            const end = new Date(dataHoraISO);
            end.setMinutes(end.getMinutes() + 60);
            return end.toISOString().slice(0, 16);
          })(),
          attendees: [
            ...(sugestao.workshop_email ? [sugestao.workshop_email] : []),
            ...(sugestao.socios_emails || []),
          ].filter(Boolean),
        });
        googleEventId = gcalResult?.eventId || gcalResult?.id || null;
        meetLink = gcalResult?.meetLink || gcalResult?.hangoutLink || null;
      } catch (gcalErr) {
        console.warn('Google Calendar falhou, continuando sem Meet:', gcalErr.message);
      }

      // 4. VALIDA WORKSHOP (CRÍTICO: evita loop infinito se deletado)
      const workshop = await base44.asServiceRole.entities.Workshop.get(sugestao.workshop_id);
      if (!workshop) {
        // Workshop deletado → marca como falha e PARA
        await base44.asServiceRole.entities.SugestaoAgendamento.update(sugestao_id, {
          status: 'reprovado',
          motivo_reprovacao: 'Workshop não encontrado (possivelmente deletado)',
        });
        return Response.json({ 
          error: 'Workshop não encontrado. Sugestão marcada como reprovada.', 
          status: 404 
        });
      }

      const emailsDestino = [];
      if (workshop.email) emailsDestino.push(workshop.email);
      
      if (workshop.partner_ids && workshop.partner_ids.length > 0) {
        for (const partnerId of workshop.partner_ids) {
          try {
            const socio = await base44.asServiceRole.entities.User.get(partnerId);
            if (socio?.email) emailsDestino.push(socio.email);
          } catch (e) {
            console.warn('Sócio não encontrado:', partnerId);
          }
        }
      }

      // 5. Envia e-mail para empresa + sócios (NÃO-BLOQUEANTE com TIMEOUT)
      const dataFormatada = new Date(dataHoraISO).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
      });

      const emailsDestinoCleaned = [...new Set(emailsDestino)].filter(Boolean);
      
      // Enviar ASSINCRONAMENTE com TIMEOUT de 10 segundos
      const emailPromises = emailsDestinoCleaned.map(async (email) => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout email')), 10000)
        );
        
        const emailSendPromise = (async () => {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: email,
              subject: `Reunião agendada: ${tipoFinal} - ${dataFormatada} às ${horaFinal}`,
              body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a1a1a; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">📅 Reunião Agendada</h1>
  </div>
  <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5;">
    <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
      Olá! Sua reunião foi agendada com sucesso.
    </p>
    
    <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;">Tipo:</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px; font-weight: bold;">${tipoFinal}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Data:</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px; font-weight: bold;">${dataFormatada}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Horário:</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px; font-weight: bold;">${horaFinal}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Consultor:</td>
          <td style="padding: 8px 0; color: #111; font-size: 14px;">${consultorNomeFinal}</td>
        </tr>
        ${meetLink ? `
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Link:</td>
          <td style="padding: 8px 0;">
            <a href="${meetLink}" style="color: #1a73e8; font-size: 14px;">Entrar no Google Meet</a>
          </td>
        </tr>` : ''}
      </table>
    </div>
    
    <p style="color: #888; font-size: 12px; margin: 0;">
      Esta é uma confirmação automática. Em caso de dúvidas, entre em contato com seu consultor.
    </p>
  </div>
</div>
            `.trim(),
            });
            return { email, sucesso: true };
          } catch (err) {
            console.warn(`E-mail falhou para ${email}:`, err.message);
            return { email, sucesso: false, erro: err.message };
          }
        })();
        
        // Race entre email e timeout
        return Promise.race([emailSendPromise, timeoutPromise]);
      });

      // NÃO AGUARDA - deixa rodar em background com tratamento de erro
      Promise.all(emailPromises)
        .then(results => {
          const successCount = results.filter(r => r.sucesso).length;
          console.log(`✅ ${successCount}/${results.length} e-mails enviados em background`);
        })
        .catch(err => 
          console.error('❌ Erro ao enviar e-mails em background:', err.message)
        );

      const emailEnviado = true; // Sempre true (enviando em background)

      // 6. Atualiza sugestão com tudo concluído
      await base44.asServiceRole.entities.SugestaoAgendamento.update(sugestao_id, {
        status: 'aprovado',
        tipo_atendimento_final: tipoFinal,
        data_final: dataFinal,
        hora_final: horaFinal,
        consultor_id: consultorIdFinal,
        consultor_nome: consultorNomeFinal,
        atendimento_criado_id: novoAtendimento.id,
        google_event_id: googleEventId,
        google_meet_link: meetLink,
        email_enviado: emailEnviado,
        socios_emails: emailsDestino,
      });

      return Response.json({
        success: true,
        acao: 'aprovado',
        atendimento_id: novoAtendimento.id,
        meet_link: meetLink,
        email_enviado: emailEnviado,
      });
    }

    return Response.json({ error: 'acao deve ser "aprovar" ou "reprovar"' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao processar sugestão:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
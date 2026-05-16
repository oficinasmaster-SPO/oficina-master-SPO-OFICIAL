import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Processa decisão do admin sobre sugestão de horário
 * ACEITAR: atualiza data_agendada, atualiza Google Calendar, notifica cliente
 * RECUSAR: mantém original, envia email amigável ao cliente
 * LEMBRAR DEPOIS: incrementa contador de lembretes (max 3)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const {
      atendimento_id,
      decisao, // "aceitar" | "recusar" | "lembrar_depois"
      data_nova, // se aceitar
      hora_nova  // se aceitar
    } = await req.json();

    if (!atendimento_id || !decisao) {
      return Response.json({ error: 'atendimento_id e decisao obrigatórios' }, { status: 400 });
    }

    // ── Buscar atendimento ──
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // ── Buscar workshop ──
    const workshop = await base44.entities.Workshop.get(atendimento.workshop_id);

    if (decisao === 'aceitar') {
      // ✅ ACEITAR: Confirma nova data
      if (!data_nova || !hora_nova) {
        return Response.json({ error: 'data_nova e hora_nova obrigatórios para aceitar' }, { status: 400 });
      }

      const novaData = new Date(`${data_nova}T${hora_nova}:00`);
      
      // Atualizar atendimento
      await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
        data_agendada: novaData.toISOString(),
        status: 'agendado',
        data_sugerida_cliente: null,
        hora_sugerida_cliente: null,
        mensagem_cliente: null
      });

      // Sincronizar Google Calendar se existe link
      if (atendimento.google_event_id) {
        try {
          await base44.functions.invoke('updateGoogleMeetEvent', {
            event_id: atendimento.google_event_id,
            start_time: novaData.toISOString(),
            duration_minutes: atendimento.duracao_minutos || 60
          });
        } catch (e) {
          console.warn('Erro ao atualizar Google Calendar:', e.message);
        }
      }

      // Notificar cliente (ACEITO)
      try {
        await base44.functions.invoke('notificarClienteSugestaoAceita', {
          atendimento_id,
          workshop_id: atendimento.workshop_id,
          data_nova,
          hora_nova,
          consultor_nome: atendimento.consultor_nome
        });
      } catch (e) {
        console.warn('Erro ao notificar cliente:', e.message);
      }

      return Response.json({
        success: true,
        message: 'Sugestão aceita! Cliente foi notificado.',
        atendimento_id
      });

    } else if (decisao === 'recusar') {
      // ❌ RECUSAR: Mantém data original
      await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
        status: 'agendado',
        data_sugerida_cliente: null,
        hora_sugerida_cliente: null,
        mensagem_cliente: null
      });

      // Notificar cliente (RECUSADO - amigável)
      try {
        await base44.functions.invoke('notificarClienteSugestaoRecusada', {
          atendimento_id,
          workshop_id: atendimento.workshop_id,
          data_original: atendimento.data_agendada,
          consultor_nome: atendimento.consultor_nome
        });
      } catch (e) {
        console.warn('Erro ao notificar cliente:', e.message);
      }

      return Response.json({
        success: true,
        message: 'Sugestão recusada. Cliente foi notificado.',
        atendimento_id
      });

    } else if (decisao === 'lembrar_depois') {
      // 🔔 LEMBRAR DEPOIS: Incrementa contador (max 3x)
      const contagemLembretes = (atendimento.contagem_lembretes_sugestao || 0) + 1;
      
      if (contagemLembretes > 3) {
        return Response.json({ 
          error: 'Limite de lembretes atingido (máx 3)' 
        }, { status: 400 });
      }

      await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
        contagem_lembretes_sugestao: contagemLembretes
      });

      return Response.json({
        success: true,
        message: `Lembrete marcado. ${3 - contagemLembretes} tentativa(s) restante(s).`,
        atendimento_id,
        lembretes_restantes: 3 - contagemLembretes
      });

    } else {
      return Response.json({ error: 'decisao inválida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro em processarSugestaoHorario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
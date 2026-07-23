import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cria follow-up automático pós-atendimento.
 *
 * Suporta duas formas de invocação:
 *   1. Automação entity (ConsultoriaAtendimento update):
 *      payload { event: { entity_name, entity_id, type }, data, old_data, payload_too_large }
 *   2. Invocação direta (HTTP/functions.invoke):
 *      payload { atendimento_id }
 *
 * Regra: 1 follow-up por cliente por semana (7 dias).
 * Só cria se:
 *   - Atendimento está realizado/concluído
 *   - Oficina ativa
 *   - Plano elegível (BRONZE, PRATA, GOLD, IOM, MILLIONS)
 *   - Não existe follow-up pendente nos últimos 7 dias
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // ── Resolução do atendimento (automação OU invocação direta) ──────────────
    let atendimento = null;
    let atendimentoId = null;

    if (payload.event && payload.event.entity_name === 'ConsultoriaAtendimento') {
      // Caminho da automação entity
      atendimentoId = payload.event.entity_id;
      atendimento = payload.data;
      if (payload.payload_too_large || !atendimento) {
        atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento
          .get(atendimentoId).catch(() => null);
      }
    } else {
      // Caminho de invocação direta
      atendimentoId = payload.atendimento_id;
      if (!atendimentoId) {
        return Response.json({ error: 'atendimento_id required' }, { status: 400 });
      }
      atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento
        .get(atendimentoId).catch(() => null);
    }

    if (!atendimento) {
      return Response.json({ error: 'Atendimento not found' }, { status: 404 });
    }

    // 1. Verificar se atendimento foi realizado/concluído
    if (!['realizado', 'concluido'].includes(atendimento.status)) {
      return Response.json({
        message: `Atendimento status "${atendimento.status}" — follow-up não aplicável`,
        created: false,
        skipped: true,
      });
    }

    const consultorId = atendimento.consultor_id;
    if (!consultorId) {
      return Response.json({
        message: 'Atendimento sem consultor_id — não é possível criar follow-up',
        created: false,
        skipped: true,
      });
    }

    // 2. Buscar workshop
    const workshop = await base44.asServiceRole.entities.Workshop
      .get(atendimento.workshop_id).catch(() => null);
    if (!workshop) {
      return Response.json({ error: 'Workshop not found' }, { status: 404 });
    }

    // 3. Guard: não criar follow-ups para oficinas inativas
    if (workshop.status === 'inativo') {
      return Response.json({
        message: `Oficina ${workshop.name} está inativa. Follow-up não criado.`,
        created: false,
        skipped: true,
      });
    }

    // 4. Verificar plano elegível
    const planosElegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
    if (!planosElegiveis.includes(workshop.planoAtual)) {
      return Response.json({
        message: `Plano ${workshop.planoAtual} não elegível para follow-up automático`,
        created: false,
        skipped: true,
      });
    }

    // 5. Verificar follow-ups pendentes nos últimos 7 dias (timezone nativa)
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const followUpsPendentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      workshop_id: workshop.id,
      is_completed: false,
    });

    const followUpsRecentes = followUpsPendentes.filter((fu) => {
      if (!fu.created_date) return false;
      return new Date(fu.created_date) >= seteDiasAtras;
    });

    if (followUpsRecentes.length > 0) {
      return Response.json({
        message: 'Cliente já possui follow-up pendente nos últimos 7 dias',
        created: false,
        skipped: true,
        followups_existentes: followUpsRecentes.length,
      });
    }

    // 6. Verificar último contato concluído
    const followUpsConcluidos = await base44.asServiceRole.entities.FollowUpConcluido.filter({
      workshop_id: workshop.id,
    }, '-completedAt', 1);

    if (followUpsConcluidos && followUpsConcluidos.length > 0) {
      const ultimoContato = followUpsConcluidos[0];
      const dataRef = ultimoContato.dataContato || ultimoContato.completedAt;
      if (dataRef) {
        const diasDesdeUltimoContato = Math.floor(
          (Date.now() - new Date(dataRef).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diasDesdeUltimoContato < 7) {
          return Response.json({
            message: `Último contato há ${diasDesdeUltimoContato} dias (< 7 dias)`,
            created: false,
            skipped: true,
          });
        }
      }
    }

    // 7. Calcular número da sequência
    const totalFollowUps = followUpsPendentes.length + (followUpsConcluidos.length || 0);
    const sequenceNumber = totalFollowUps + 1;

    // 8. Criar follow-up automático
    const hoje = new Date();
    const followUpCriado = await base44.asServiceRole.entities.FollowUpReminder.create({
      workshop_id: workshop.id,
      workshop_name: workshop.name,
      consultor_id: consultorId,
      consultor_nome: atendimento.consultor_nome || '',
      atendimento_id: atendimento.id,
      ata_id: null,
      reminder_date: hoje.toISOString().split('T')[0],
      sequence_number: sequenceNumber,
      days_since_meeting: 7,
      message: 'Follow-up semanal automático - Cliente sem contato há 7+ dias',
      is_completed: false,
      origin_type: 'manual',
      canal_origem: 'preventivo',
      notes: 'Criado automaticamente: cliente elegível sem follow-up pendente',
      consulting_firm_id: workshop.consulting_firm_id || null,
    });

    // 9. Log analytics
    await base44.analytics.track({
      eventName: 'followup_automatico_criado',
      properties: {
        workshop_id: workshop.id,
        workshop_name: workshop.name,
        plano: workshop.planoAtual,
        consultor_id: consultorId,
        sequence_number: sequenceNumber,
        atendimento_id: atendimento.id,
      },
    });

    return Response.json({
      success: true,
      message: 'Follow-up automático criado com sucesso',
      followup: followUpCriado,
      created: true,
    });
  } catch (error) {
    console.error('Erro ao criar follow-up automático:', error);
    return Response.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});
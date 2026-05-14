import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import moment from 'npm:moment@2.30.1';

/**
 * Cria follow-up automático pós-atendimento
 * Regra: 1 follow-up por cliente por semana (7 dias)
 * Só cria se:
 * - Plano é elegível (BRONZE, PRATA, GOLD, IOM, MILLIONS)
 * - Não existe follow-up pendente na semana atual
 * - Último contato foi há >= 7 dias
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { atendimento_id } = payload;

    if (!atendimento_id) {
      return Response.json({ error: 'atendimento_id required' }, { status: 400 });
    }

    // 1. Buscar atendimento
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento) {
      return Response.json({ error: 'Atendimento not found' }, { status: 404 });
    }

    // 2. Verificar se atendimento foi realizado/concluído
    if (!['realizado', 'concluido'].includes(atendimento.status)) {
      return Response.json({ 
        error: 'Atendimento precisa estar realizado ou concluído',
        status: atendimento.status
      }, { status: 400 });
    }

    // 3. Buscar workshop e verificar plano
    const workshop = await base44.entities.Workshop.get(atendimento.workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const planosElegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
    if (!planosElegiveis.includes(workshop.planoAtual)) {
      return Response.json({ 
        message: `Plano ${workshop.planoAtual} não elegível para follow-up automático`,
        created: false
      });
    }

    // 4. Verificar se já existe follow-up pendente esta semana
    const hoje = moment().tz('America/Sao_Paulo');
    const inicioSemana = hoje.clone().subtract(7, 'days');
    const fimSemana = hoje.clone();

    const followUpsPendentes = await base44.entities.FollowUpReminder.filter({
      workshop_id: workshop.id,
      is_completed: false
    });

    // Filtrar follow-ups criados nos últimos 7 dias
    const followUpsRecentes = followUpsPendentes.filter(fu => {
      const dataCriacao = moment(fu.created_date);
      return dataCriacao.isAfter(inicioSemana);
    });

    if (followUpsRecentes.length > 0) {
      return Response.json({ 
        message: 'Cliente já possui follow-up pendente nesta semana',
        created: false,
        followups_existentes: followUpsRecentes.length
      });
    }

    // 5. Verificar último contato concluído
    const followUpsConcluidos = await base44.entities.FollowUpConcluido.filter({
      workshop_id: workshop.id
    }, '-completedAt', 1);

    if (followUpsConcluidos && followUpsConcluidos.length > 0) {
      const ultimoContato = followUpsConcluidos[0];
      const dataUltimoContato = moment(ultimoContato.dataContato || ultimoContato.completedAt);
      const diasDesdeUltimoContato = hoje.diff(dataUltimoContato, 'days');

      if (diasDesdeUltimoContato < 7) {
        return Response.json({ 
          message: `Último contato há ${diasDesdeUltimoContato} dias (< 7 dias)`,
          created: false
        });
      }
    }

    // 6. Calcular número da sequência
    const totalFollowUps = followUpsPendentes.length + (followUpsConcluidos.length || 0);
    const sequenceNumber = totalFollowUps + 1;

    // 7. Criar follow-up automático
    const followUpCriado = await base44.entities.FollowUpReminder.create({
      workshop_id: workshop.id,
      workshop_name: workshop.name,
      consultor_id: atendimento.consultor_id || user.id,
      consultor_nome: atendimento.consultor_nome || user.full_name,
      atendimento_id: atendimento.id,
      ata_id: null,
      reminder_date: hoje.format('YYYY-MM-DD'),
      sequence_number: sequenceNumber,
      days_since_meeting: 7,
      message: 'Follow-up semanal automático - Cliente sem contato há 7+ dias',
      is_completed: false,
      origin_type: 'automatico_pos_atendimento',
      canal_origem: null,
      notes: 'Criado automaticamente: cliente elegível sem follow-up pendente',
      consulting_firm_id: workshop.consulting_firm_id || null
    });

    // 8. Log analytics
    await base44.analytics.track({
      eventName: 'followup_automatico_criado',
      properties: {
        workshop_id: workshop.id,
        workshop_name: workshop.name,
        plano: workshop.planoAtual,
        consultor_id: atendimento.consultor_id,
        sequence_number: sequenceNumber,
        atendimento_id: atendimento.id
      }
    });

    return Response.json({
      success: true,
      message: 'Follow-up automático criado com sucesso',
      followup: followUpCriado,
      created: true
    });

  } catch (error) {
    console.error('Erro ao criar follow-up automático:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
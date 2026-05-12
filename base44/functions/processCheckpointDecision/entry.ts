import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      followUpContador_id,
      decision, // 'next_week' | 'in_X_days' | 'on_completion'
      selectedDate,
      sprint_id,
      bucket_id,
      ata_id
    } = await req.json();

    if (!followUpContador_id || !decision) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // [1] Busca o Follow-up Contador atual
    const followUp = await base44.entities.FollowUpContador.get(followUpContador_id);

    if (!followUp) {
      return Response.json({ error: 'FollowUpContador not found' }, { status: 404 });
    }

    // [2] Atualiza o Follow-up com informações do checkpoint
    const checkpointData = {
      checkpoint_decision: decision,
      checkpoint_saved_at: new Date().toISOString(),
      checkpoint_date: selectedDate || null
    };

    await base44.entities.FollowUpContador.update(followUpContador_id, checkpointData);

    // [3] Processa a decisão
    let responseData = {
      followUpId: followUpContador_id,
      miniFollowUpId: null
    };

    if (decision === 'next_week') {
      // Cria Follow-up Semana 2
      const nextWeekDate = new Date(followUp.data_ciclo_inicio);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);

      const nextWeekEnd = new Date(followUp.data_ciclo_fim);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

      const newFollowUp = await base44.entities.FollowUpContador.create({
        workshop_id: followUp.workshop_id,
        consultor_id: followUp.consultor_id,
        consultor_nome: followUp.consultor_nome,
        origem_tipo: followUp.origem_tipo,
        origem_id: followUp.origem_id,
        origem_nome: followUp.origem_nome,
        numero_sequencia: (followUp.numero_sequencia || 1) + 1,
        total_esperado: followUp.total_esperado,
        status: 'ativo',
        ciclo_numero_semana: (followUp.ciclo_numero_semana || 1) + 1,
        data_ciclo_inicio: nextWeekDate.toISOString().split('T')[0],
        data_ciclo_fim: nextWeekEnd.toISOString().split('T')[0],
        data_criacao: new Date().toISOString(),
        consulting_firm_id: followUp.consulting_firm_id,
        contexto: {
          ...followUp.contexto,
          semana_anterior_checkpoint: true,
          parent_followup_id: followUpContador_id
        }
      });

      responseData.followUpId = newFollowUp.id;
    }

    if (decision === 'in_X_days') {
      // Cria Mini Follow-up para data específica
      if (!selectedDate) {
        return Response.json({ error: 'selectedDate required for in_X_days decision' }, { status: 400 });
      }

      const miniFollowUp = await base44.entities.FollowUpContador.create({
        workshop_id: followUp.workshop_id,
        consultor_id: followUp.consultor_id,
        consultor_nome: followUp.consultor_nome,
        origem_tipo: followUp.origem_tipo,
        origem_id: followUp.origem_id,
        origem_nome: followUp.origem_nome,
        numero_sequencia: (followUp.numero_sequencia || 1) + 0.5, // Mini follow-up tem sequência .5
        total_esperado: followUp.total_esperado,
        status: 'ativo',
        ciclo_numero_semana: followUp.ciclo_numero_semana || 1,
        data_ciclo_inicio: selectedDate,
        data_ciclo_fim: selectedDate,
        data_criacao: new Date().toISOString(),
        consulting_firm_id: followUp.consulting_firm_id,
        contexto: {
          ...followUp.contexto,
          tipo_followup: 'mini_checkpoint',
          parent_followup_id: followUpContador_id,
          is_mini: true
        }
      });

      // Atualiza o Follow-up original com referência ao mini
      await base44.entities.FollowUpContador.update(followUpContador_id, {
        mini_followup_id: miniFollowUp.id
      });

      responseData.miniFollowUpId = miniFollowUp.id;
    }

    if (decision === 'on_completion') {
      // Mantém Semana 1 aberta com status "pending_completion"
      await base44.entities.FollowUpContador.update(followUpContador_id, {
        status: 'aguardando_conclusao'
      });
    }

    // [4] Registra no histórico
    const historico = followUp.historico || [];
    historico.push({
      numero: followUp.numero_sequencia,
      acao: 'checkpoint_decision',
      decisao: decision,
      data_decisao: new Date().toISOString(),
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email,
      detalhes: {
        selectedDate,
        sprint_id,
        bucket_id,
        ata_id
      }
    });

    await base44.entities.FollowUpContador.update(followUpContador_id, {
      historico
    });

    return Response.json({
      success: true,
      ...responseData
    });
  } catch (error) {
    console.error('Error in processCheckpointDecision:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const { workshop_id, contract_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar workshop e contrato
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const planId = workshop.planoAtual || 'FREE';

    // Buscar configuração do plano
    const planFeatures = await base44.asServiceRole.entities.PlanFeature.filter({ plan_id: planId });
    const planConfig = planFeatures[0];

    if (!planConfig) {
      return Response.json({ error: 'Plano não configurado' }, { status: 404 });
    }

    // Buscar regras de atendimento
    const attendanceRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id: planId,
      is_active: true
    });

    const dataInicio = new Date();
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 30); // 30 dias de prazo

    const itemsCriados = [];

    // 1. ADICIONAR FUNCIONALIDADES
    if (planConfig.cronograma_features && planConfig.cronograma_features.length > 0) {
      for (let i = 0; i < planConfig.cronograma_features.length; i++) {
        const feature = planConfig.cronograma_features[i];
        
        // Distribuir uniformemente ao longo dos 30 dias
        const diasOffset = Math.floor((30 / planConfig.cronograma_features.length) * i);
        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + diasOffset);

        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id: workshop_id,
          item_id: feature,
          item_tipo: 'funcionalidade'
        });

        if (existing && existing.length > 0) continue;

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id: workshop_id,
          item_tipo: 'funcionalidade',
          item_id: feature,
          item_nome: feature.replace(/_/g, ' ').toUpperCase(),
          item_categoria: 'funcionalidades',
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataFim.toISOString(),
          progresso_percentual: 0,
          total_visualizacoes: 0
        });

        itemsCriados.push(item);
      }
    }

    // 2. ADICIONAR MÓDULOS
    if (planConfig.cronograma_modules && planConfig.cronograma_modules.length > 0) {
      for (let i = 0; i < planConfig.cronograma_modules.length; i++) {
        const module = planConfig.cronograma_modules[i];
        
        const diasOffset = Math.floor((30 / planConfig.cronograma_modules.length) * i);
        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + diasOffset);

        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id: workshop_id,
          item_id: module,
          item_tipo: 'modulo'
        });

        if (existing && existing.length > 0) continue;

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id: workshop_id,
          item_tipo: 'modulo',
          item_id: module,
          item_nome: module,
          item_categoria: 'modulos',
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataFim.toISOString(),
          progresso_percentual: 0,
          total_visualizacoes: 0
        });

        itemsCriados.push(item);
      }
    }

    // 3. ADICIONAR ATENDIMENTOS
    if (attendanceRules && attendanceRules.length > 0) {
      for (let i = 0; i < attendanceRules.length; i++) {
        const rule = attendanceRules[i];
        
        const attendanceType = await base44.asServiceRole.entities.AttendanceType.get(rule.attendance_type_id);

        const existing = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
          workshop_id: workshop_id,
          item_id: rule.attendance_type_id,
          item_tipo: 'atendimento'
        });

        if (existing && existing.length > 0) continue;

        // Distribuir atendimentos ao longo dos 30 dias
        const diasOffset = Math.floor((30 / attendanceRules.length) * i);
        const dataInicioItem = new Date(dataInicio);
        dataInicioItem.setDate(dataInicioItem.getDate() + diasOffset);

        const item = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id: workshop_id,
          item_tipo: 'atendimento',
          item_id: rule.attendance_type_id,
          item_nome: `${attendanceType.name} (${rule.total_allowed}x)`,
          item_categoria: 'atendimentos',
          status: 'a_fazer',
          data_inicio_real: dataInicioItem.toISOString(),
          data_termino_previsto: dataFim.toISOString(),
          progresso_percentual: 0,
          total_visualizacoes: 0
        });

        itemsCriados.push(item);

        // Criar ContractAttendances se tiver contrato
        if (contract_id && rule.scheduling_type === 'frequency' && rule.frequency_days) {
          for (let j = 0; j < rule.total_allowed; j++) {
            const scheduledDate = new Date(dataInicio);
            scheduledDate.setDate(scheduledDate.getDate() + (rule.frequency_days * j));

            await base44.asServiceRole.entities.ContractAttendance.create({
              contract_id: contract_id,
              workshop_id: workshop_id,
              plan_id: planId,
              attendance_type_id: rule.attendance_type_id,
              attendance_type_name: attendanceType.name,
              scheduled_date: scheduledDate.toISOString(),
              status: 'pendente',
              generated_by: 'system',
              sequence_number: j + 1
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cronograma completo gerado: ${itemsCriados.length} itens criados`,
      items_count: itemsCriados.length,
      prazo_dias: 30
    });

  } catch (error) {
    console.error('Error generating full cronograma:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Root Cause Analysis: Por que workshop tem 0 ConsultoriaAtendimento realizados?
 * 
 * INVESTIGAÇÃO EM 3 CAMADAS:
 * 1. Dados do workshop (plano, status, consultorias ativas)
 * 2. ConsultoriaAtendimento (todos os status, não só 'realizado')
 * 3. ContractAttendance (duplicatas, órfãos, migrated)
 * 
 * RETORNA: Diagnóstico completo com recomendações de ação
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    log('root_cause_analysis_started', 'Iniciando investigação', { workshop_id });

    // CAMADA 1: Dados do Workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Workshop not found' }, { status: 404 });
    }

    const workshopData = {
      id: workshop.id,
      name: workshop.name,
      status: workshop.status,
      plan: workshop.planoAtual,
      planStatus: workshop.planStatus,
      consulting_firm_id: workshop.consulting_firm_id,
      active: workshop.status === 'ativo' && (workshop.planStatus === 'active' || workshop.planStatus === 'trial')
    };

    log('workshop_data', 'Dados do workshop', workshopData);

    // CAMADA 2: ConsultoriaAtendimento (todos os status)
    const allAttendances = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id },
      '-data_agendada',
      200
    );

    const byStatus = {};
    const byType = {};
    let realizedCount = 0;

    for (const att of (allAttendances || [])) {
      // Por status
      if (!byStatus[att.status]) byStatus[att.status] = 0;
      byStatus[att.status]++;

      if (att.status === 'realizado' || att.status === 'concluido') {
        realizedCount++;
      }

      // Por tipo
      const typeKey = att.tipo_atendimento || 'unknown';
      if (!byType[typeKey]) {
        byType[typeKey] = { total: 0, realized: 0 };
      }
      byType[typeKey].total++;
      if (att.status === 'realizado' || att.status === 'concluido') {
        byType[typeKey].realized++;
      }
    }

    log('consultoria_atendimento_analysis', 'Análise de atendimentos', {
      total_attendances: (allAttendances || []).length,
      realized_count: realizedCount,
      by_status: byStatus,
      by_type: byType
    });

    // CAMADA 3: ContractAttendance
    const contractAttendances = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const contractByType = {};
    let linkedCount = 0;
    let migratedCount = 0;

    for (const att of (contractAttendances || [])) {
      const typeKey = att.attendance_type_id || 'unknown';
      if (!contractByType[typeKey]) {
        contractByType[typeKey] = { total: 0, linked: 0, migrated: 0 };
      }
      contractByType[typeKey].total++;
      
      if (att.consultoria_atendimento_id) {
        contractByType[typeKey].linked++;
        linkedCount++;
      }
      
      if (att.attendance_type_id === 'migrated') {
        contractByType[typeKey].migrated++;
        migratedCount++;
      }
    }

    log('contract_attendance_analysis', 'Análise de ContractAttendance', {
      total: (contractAttendances || []).length,
      linked_count: linkedCount,
      migrated_count: migratedCount,
      by_type: contractByType
    });

    // DIAGNÓSTICO
    const diagnosis = {
      has_zero_realized: realizedCount === 0,
      has_no_attendances_at_all: (allAttendances || []).length === 0,
      has_migrated_records: migratedCount > 0,
      has_unlinked_attendances: linkedCount === 0 && (contractAttendances || []).length > 0,
      workshop_inactive: !workshopData.active,
      possible_causes: []
    };

    // Identificar causas raiz
    if (diagnosis.has_no_attendances_at_all) {
      diagnosis.possible_causes.push({
        cause: 'no_attendances_registered',
        description: 'Nenhum atendimento de consultoria foi registrado para este workshop',
        recommendation: 'Verificar se consultorias foram agendadas/realizadas. Criar atendimentos manualmente ou via bucket.',
        severity: 'high'
      });
    }

    if (diagnosis.workshop_inactive) {
      diagnosis.possible_causes.push({
        cause: 'workshop_inactive',
        description: `Workshop inativo (status: ${workshopData.status}, plan: ${workshopData.planStatus})`,
        recommendation: 'Reativar workshop ou regularizar plano para permitir novos atendimentos',
        severity: 'critical'
      });
    }

    if (diagnosis.has_migrated_records) {
      diagnosis.possible_causes.push({
        cause: 'migrated_records_present',
        description: `${migratedCount} registros migrated indicam migração incompleta`,
        recommendation: 'Rodar repairMigratedAttendances para regenerar atendimentos do plano',
        severity: 'medium'
      });
    }

    if (diagnosis.has_unlinked_attendances && realizedCount > 0) {
      diagnosis.possible_causes.push({
        cause: 'attendances_not_linked',
        description: `${linkedCount} de ${(contractAttendances || []).length} ContractAttendance vinculados — pode haver duplicatas`,
        recommendation: 'Rodar cleanupDuplicateAttendances seguido de backfillLinkAttendancesToRealized',
        severity: 'medium'
      });
    }

    if (realizedCount === 0 && (allAttendances || []).length > 0) {
      diagnosis.possible_causes.push({
        cause: 'attendances_not_marked_realized',
        description: `Existem ${(allAttendances || []).length} atendimentos mas nenhum marcado como 'realizado'`,
        recommendation: 'Verificar status dos atendimentos. Possíveis status: agendado, confirmado, cancelado, remarcado, faltou',
        severity: 'high'
      });
    }

    log('diagnosis_complete', 'Diagnóstico completo', diagnosis);

    // RECOMENDAÇÕES DE AÇÃO
    const actions = [];

    if (diagnosis.workshop_inactive) {
      actions.push({
        action: 'reactivate_workshop',
        priority: 1,
        function: 'adminUpdateWorkshopPlan',
        params: { workshop_id, status: 'ativo' }
      });
    }

    if (diagnosis.has_no_attendances_at_all) {
      actions.push({
        action: 'generate_attendances',
        priority: 2,
        function: 'generateWorkshopAttendances',
        params: { workshop_id }
      });
    }

    if (diagnosis.has_migrated_records) {
      actions.push({
        action: 'repair_migrated',
        priority: 3,
        function: 'repairMigratedAttendances',
        params: { workshop_id, dry_run: false }
      });
    }

    if (diagnosis.has_unlinked_attendances || realizedCount > 0) {
      actions.push({
        action: 'cleanup_duplicates',
        priority: 4,
        function: 'cleanupDuplicateAttendances',
        params: { workshop_id, dry_run: false }
      });
      
      actions.push({
        action: 'link_attendances',
        priority: 5,
        function: 'backfillLinkAttendancesToRealized',
        params: { workshop_id, dry_run: false }
      });
    }

    const result = {
      workshop_id,
      workshop_name: workshopData.name,
      analysis: {
        workshop: workshopData,
        consultoria_atendimento: {
          total: (allAttendances || []).length,
          realized: realizedCount,
          by_status: byStatus,
          by_type: byType
        },
        contract_attendance: {
          total: (contractAttendances || []).length,
          linked: linkedCount,
          migrated: migratedCount,
          by_type: contractByType
        }
      },
      diagnosis,
      recommended_actions: actions
    };

    log('analysis_completed', 'Análise concluída', result);

    return Response.json(result);

  } catch (error) {
    console.error('Erro na root cause analysis:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
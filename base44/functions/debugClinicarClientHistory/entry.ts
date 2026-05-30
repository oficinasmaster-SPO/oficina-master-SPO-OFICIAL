/**
 * Debug: Auditoria Cliente Cliniciar — ClientHistoryFloatingPanel
 * 
 * Diagnostica discrepância entre atendimentos do plano (bucket) vs realizados
 * Específico para o bug reportado: 6/6 mostrados, mas apenas 3 realizados
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Buscar workshop por NOME
    const allWorkshops = await base44.asServiceRole.entities.Workshop.list(null, 1000);
    const cliniciarWorkshop = (allWorkshops || []).find(w => 
      w.name?.toLowerCase().includes('clinic') ||
      w.razao_social?.toLowerCase().includes('clinic')
    );
    
    if (!cliniciarWorkshop) {
      return Response.json({
        error: 'Workshop "Cliniciar" não encontrado',
        workshops_com_cliniciar: (allWorkshops || [])
          .filter(w => w.name?.includes('Clinic') || w.name?.includes('clinic'))
          .map(w => ({ id: w.id, name: w.name }))
      }, { status: 404 });
    }

    const WORKSHOP_ID = cliniciarWorkshop.id;
    const PLAN_ID = cliniciarWorkshop.planoAtual || 'PRATA';

    console.log(`🔍 Auditoria Cliente: ${cliniciarWorkshop.name} (${WORKSHOP_ID})`);

    // 1. Buscar ContractAttendance (bucket do plano) — TODOS, sem filtro
    const bucketsAll = await base44.asServiceRole.entities.ContractAttendance.list(null, 500);
    const buckets = (bucketsAll || []).filter(b => b.workshop_id === WORKSHOP_ID);
    const bucketsOtherWorkshops = (bucketsAll || []).filter(b => b.workshop_id !== WORKSHOP_ID);

    console.log(`📦 ContractAttendance workshop ${WORKSHOP_ID}: ${buckets?.length || 0}`);
    console.log(`📦 ContractAttendance OUTROS workshops: ${bucketsOtherWorkshops?.length || 0}`);

    // 2. Buscar ConsultoriaAtendimento (realizados) — TODOS
    const realizadosAll = await base44.asServiceRole.entities.ConsultoriaAtendimento.list(null, 500);
    const realizados = (realizadosAll || []).filter(r => 
      r.workshop_id === WORKSHOP_ID && 
      ['realizado', 'concluido'].includes(r.status)
    );

    console.log(`✅ ConsultoriaAtendimento workshop ${WORKSHOP_ID} realizados: ${realizados?.length || 0}`);
    console.log(`✅ ConsultoriaAtendimento OUTROS workshops: ${realizadosAll?.length - realizados?.length || 0}`);

    // 3. Buscar PlanAttendanceRule (regras do plano)
    const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id: PLAN_ID
    }, null, 200);

    console.log(`📋 PlanAttendanceRule do plano ${PLAN_ID}: ${planRules?.length || 0}`);

    // 4. Agrupar buckets por tipo (COMO O PAINEL FAZ)
    const groupedByType = {};
    for (const b of (buckets || [])) {
      const key = b.attendance_type_id;
      if (!key || key === 'migrated') continue;
      if (!groupedByType[key]) {
        groupedByType[key] = [];
      }
      groupedByType[key].push(b);
    }

    // 5. Deduplicar (LÓGICA ATUAL DO PAINEL)
    const bucketByType = {};
    for (const [typeId, items] of Object.entries(groupedByType)) {
      const withLink = items.filter(a => a.consultoria_atendimento_id);
      let selected;
      
      if (withLink.length > 0) {
        withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
        selected = withLink[0];
      } else {
        items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
        selected = items[0];
      }
      
      bucketByType[typeId] = {
        name: selected.attendance_type_name || typeId,
        total: 1,
        done: selected.consultoria_atendimento_id ? 1 : 0,
        sequence_number: selected.sequence_number || 0,
        items_count: items.length, // QUANTOS DUPLICADOS EXISTEM
        has_link: !!selected.consultoria_atendimento_id
      };
    }

    // 6. Cruzar com realizados (MATCHING)
    const normalized = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
    
    const realizadosByType = {};
    for (const r of (realizados || [])) {
      const key = normalized(r.tipo_atendimento);
      if (!realizadosByType[key]) {
        realizadosByType[key] = [];
      }
      realizadosByType[key].push(r);
    }

    // 7. Diagnóstico final
    const diagnosis = {
      workshop_id: WORKSHOP_ID,
      plan_id: PLAN_ID,
      summary: {
        total_bucket_types: Object.keys(bucketByType).length,
        total_realizados: realizados?.length || 0,
        completed_types: Object.values(bucketByType).filter(v => v.done > 0).length,
        pending_types: Object.values(bucketByType).filter(v => v.done === 0).length
      },
      bucket_details: Object.entries(bucketByType).map(([typeId, data]) => ({
        type_id: typeId,
        name: data.name,
        sequence: data.sequence_number,
        done: data.done,
        total: data.total,
        duplicates_in_bucket: data.items_count, // BUG: múltiplos registros?
        has_link: data.has_link,
        realized_count: realizadosByType[normalized(data.name)]?.length || 0
      })),
      realizados_details: (realizados || []).map(r => ({
        id: r.id,
        tipo: r.tipo_atendimento,
        status: r.status,
        data: r.data_agendada,
        consultor: r.consultor_nome
      })),
      plan_rules: (planRules || []).map(r => ({
        type_id: r.attendance_type_id,
        name: r.attendance_type_name,
        sequence: r.sequence_number,
        total_allowed: r.total_allowed
      }))
    };

    // 8. Identificar problemas
    const issues = [];
    
    // Problema 1: Múltiplos registros do mesmo tipo
    for (const [typeId, items] of Object.entries(groupedByType)) {
      if (items.length > 1) {
        issues.push({
          type: 'DUPLICATE_BUCKET',
          severity: 'HIGH',
          description: `Tipo "${typeId}" tem ${items.length} registros no bucket`,
          items: items.map(i => ({
            id: i.id,
            has_link: !!i.consultoria_atendimento_id,
            date: i.scheduled_date
          }))
        });
      }
    }

    // Problema 2: Realizados sem link no bucket
    for (const r of (realizados || [])) {
      const normalizedType = normalized(r.tipo_atendimento);
      const bucketEntry = Object.values(bucketByType).find(b => 
        normalized(b.name) === normalizedType
      );
      
      if (!bucketEntry || !bucketEntry.has_link) {
        issues.push({
          type: 'ORPHAN_REALIZADO',
          severity: 'MEDIUM',
          description: `Realizado "${r.tipo_atendimento}" não tem link no bucket`,
          realizado: { id: r.id, tipo: r.tipo_atendimento, data: r.data_agendada }
        });
      }
    }

    // Problema 3: Excesso de um tipo específico (ex: 2x Mentoria Performance)
    for (const [typeId, items] of Object.entries(groupedByType)) {
      const typeData = bucketByType[typeId];
      if (typeData && typeData.name.includes('Performance') && items.length > 1) {
        issues.push({
          type: 'EXCESS_TYPE',
          severity: 'CRITICAL',
          description: `Cliente tem ${items.length}x "${typeData.name}" mas plano permite apenas 1`,
          items: items.map(i => ({
            id: i.id,
            has_link: !!i.consultoria_atendimento_id,
            date: i.scheduled_date
          }))
        });
      }
    }

    return Response.json({
      success: true,
      diagnosis,
      issues,
      issue_count: issues.length,
      recommendation: issues.length > 0 
        ? 'Execute cleanupDuplicateAttendances ou backfillLinkAttendancesToRealized'
        : 'Dados consistentes'
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
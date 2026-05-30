import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação Preventiva: Cleanup + Link Automático
 * 
 * GATILHO: Executado após repairMigratedAttendances ou bulkGenerateAttendances
 * 
 * FLUXO:
 * 1. Cleanup de duplicatas (se existir)
 * 2. Backfill de links (vincular a realizados)
 * 3. Validação (1 registro por tipo + link quando possível)
 * 
 * IDÊMPOTENTE: Pode rodar múltiplas vezes sem efeito colateral
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

    const { workshop_id, dry_run = false } = await req.json();

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    log('preventive_automation_started', 'Iniciando automação preventiva', {
      workshop_id,
      dry_run
    });

    // STEP 1: Cleanup de duplicatas
    log('step1_cleanup', 'Iniciando cleanup de duplicatas', { workshop_id });

    const allAttendances = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const attendances = (allAttendances || []).filter(a => 
      a.attendance_type_id && a.attendance_type_id !== 'migrated'
    );

    // Agrupar por tipo
    const byType = {};
    for (const att of attendances) {
      const key = att.attendance_type_id;
      if (!byType[key]) byType[key] = [];
      byType[key].push(att);
    }

    const duplicateTypes = Object.entries(byType)
      .filter(([_, items]) => items.length > 1)
      .map(([typeId, items]) => ({
        type_id: typeId,
        count: items.length
      }));

    log('duplicates_found', `Encontradas ${duplicateTypes.length} duplicatas`, {
      count: duplicateTypes.length,
      details: duplicateTypes
    });

    let cleanupDeleted = 0;

    if (!dry_run && duplicateTypes.length > 0) {
      // Executar cleanup
      for (const [typeId, items] of Object.entries(byType)) {
        if (items.length <= 1) continue;

        const withLink = items.filter(a => a.consultoria_atendimento_id);
        let selected;

        if (withLink.length > 0) {
          withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
          selected = withLink[0];
        } else {
          items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
          selected = items[0];
        }

        const toDelete = items.filter(i => i.id !== selected.id);
        for (const att of toDelete) {
          try {
            await base44.entities.ContractAttendance.delete(att.id);
            cleanupDeleted++;
            log('deleted', `Deletado`, {
              id: att.id,
              type: att.attendance_type_name
            });
          } catch (error) {
            log('delete_error', `Falha ao deletar`, {
              id: att.id,
              error: error.message
            });
          }
        }
      }

      log('cleanup_completed', `Cleanup concluído: ${cleanupDeleted} deletados`, {
        deleted: cleanupDeleted
      });
    }

    // STEP 2: Backfill de links
    log('step2_backfill', 'Iniciando backfill de links', { workshop_id });

    // Buscar ConsultoriaAtendimento realizados
    const realizados = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id },
      '-data_agendada',
      500
    );

    const realizadosList = (realizados || []).filter(r => 
      r.status === 'realizado' || r.status === 'concluido'
    );

    log('realizados_found', `Encontrados ${realizadosList.length} realizados`, {
      count: realizadosList.length
    });

    let linksCreated = 0;

    if (!dry_run && realizadosList.length > 0) {
      const normalize = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();

      for (const realizado of realizadosList) {
        // Buscar ContractAttendance SEM link
        const attFilter = { workshop_id };
        const candidates = (await base44.entities.ContractAttendance.filter(attFilter, null, 200))
          .filter(c => 
            !c.consultoria_atendimento_id && 
            c.attendance_type_id !== 'migrated'
          );

        if (!candidates || candidates.length === 0) continue;

        // Filtrar por similaridade de nome
        const realizadoNome = normalize(realizado.tipo_atendimento);
        const matches = candidates.filter(c => {
          const attendanceNome = normalize(c.attendance_type_name);
          return attendanceNome.includes(realizadoNome) || realizadoNome.includes(attendanceNome);
        });

        if (matches.length === 0) continue;

        // Ordenar por data mais próxima
        const realizadoDate = new Date(realizado.data_agendada);
        matches.sort((a, b) => {
          const dateA = new Date(a.scheduled_date);
          const dateB = new Date(b.scheduled_date);
          return Math.abs(dateA - realizadoDate) - Math.abs(dateB - realizadoDate);
        });

        // Vincular o mais próximo
        const selected = matches[0];
        try {
          await base44.entities.ContractAttendance.update(selected.id, {
            consultoria_atendimento_id: realizado.id,
            status: 'realizado'
          });
          linksCreated++;
          log('link_created', `Link criado`, {
            contract_attendance_id: selected.id,
            consultoria_atendimento_id: realizado.id,
            type: selected.attendance_type_name
          });
        } catch (error) {
          log('link_error', `Falha ao criar link`, {
            id: selected.id,
            error: error.message
          });
        }
      }

      log('backfill_completed', `Backfill concluído: ${linksCreated} links`, {
        created: linksCreated
      });
    }

    // STEP 3: Validação
    log('step3_validation', 'Validando resultado', { workshop_id });

    const finalAttendances = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const finalByType = {};
    for (const att of (finalAttendances || [])) {
      const key = att.attendance_type_id;
      if (!finalByType[key]) finalByType[key] = { total: 0, linked: 0 };
      finalByType[key].total++;
      if (att.consultoria_atendimento_id) finalByType[key].linked++;
    }

    const validationIssues = [];
    for (const [typeId, data] of Object.entries(finalByType)) {
      if (data.total > 1) {
        validationIssues.push({
          type: 'duplicate_remains',
          type_id: typeId,
          count: data.total
        });
      }
      if (data.total === 1 && data.linked === 0 && typeId !== 'migrated') {
        validationIssues.push({
          type: 'unlinked_attendance',
          type_id: typeId,
          has_realized: realizadosList.some(r => 
            normalize(r.tipo_atendimento).includes(normalize(data.type_name || ''))
          )
        });
      }
    }

    if (validationIssues.length > 0) {
      log('validation_issues', `Validação encontrou ${validationIssues.length} issues`, {
        count: validationIssues.length,
        issues: validationIssues
      });
    } else {
      log('validation_passed', 'Validação passou — sem issues', {
        total_types: Object.keys(finalByType).length
      });
    }

    // SUMMARY
    const summary = {
      workshop_id,
      dry_run,
      cleanup: {
        duplicates_found: duplicateTypes.length,
        deleted: cleanupDeleted
      },
      backfill: {
        realizados_processed: realizadosList.length,
        links_created: linksCreated
      },
      validation: {
        passed: validationIssues.length === 0,
        issues: validationIssues,
        final_state: finalByType
      }
    };

    log('automation_completed', 'Automação preventiva concluída', summary);

    return Response.json({
      success: true,
      summary,
      next_steps: validationIssues.length > 0 ? 
        'Manual review required' : 
        'ContractAttendance integrity restored'
    });

  } catch (error) {
    console.error('Erro na automação preventiva:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

function normalize(str) {
  return (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
}
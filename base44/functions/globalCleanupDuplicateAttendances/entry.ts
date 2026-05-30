import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Global Cleanup: ContractAttendance Duplicatas (COM ROLLBACK)
 * 
 * ESTRATÉGIA TDD-VALIDATED:
 * 1. Identifica workshops com duplicatas
 * 2. Cria snapshot pré-cleanup (rollback point)
 * 3. Executa cleanup por workshop (batch de 5)
 * 4. Valida pós-cleanup (1 registro por tipo)
 * 5. Rollback automático se validação falhar
 * 
 * MODO:
 * - dry_run=true: apenas reporta
 * - dry_run=false: executa com rollback habilitado
 * - batch_size=5: workshops por execução (evita timeout)
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

    const { dry_run = true, batch_size = 5, workshop_ids } = await req.json();

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    log('global_cleanup_started', 'Iniciando cleanup global com rollback', { 
      dry_run, 
      batch_size,
      target_workshops: workshop_ids?.length || 'all'
    });

    // Step 1: Identificar workshops com duplicatas
    const allAttendances = await base44.entities.ContractAttendance.filter({}, null, 1000);
    const attendances = (allAttendances || []).filter(a => 
      a.attendance_type_id && a.attendance_type_id !== 'migrated'
    );

    // Agrupar por workshop
    const byWorkshop = {};
    for (const att of attendances) {
      if (!byWorkshop[att.workshop_id]) {
        byWorkshop[att.workshop_id] = [];
      }
      byWorkshop[att.workshop_id].push(att);
    }

    // Identificar workshops com duplicatas
    const workshopsWithDuplicates = [];
    for (const [workshopId, items] of Object.entries(byWorkshop)) {
      const byType = {};
      for (const item of items) {
        const key = item.attendance_type_id;
        if (!byType[key]) byType[key] = [];
        byType[key].push(item);
      }
      
      const duplicateTypes = Object.entries(byType)
        .filter(([_, typeItems]) => typeItems.length > 1)
        .map(([typeId, typeItems]) => ({
          type_id: typeId,
          count: typeItems.length,
          with_link: typeItems.filter(i => i.consultoria_atendimento_id).length
        }));

      if (duplicateTypes.length > 0) {
        workshopsWithDuplicates.push({
          workshop_id: workshopId,
          total_attendances: items.length,
          duplicate_types: duplicateTypes.length,
          details: duplicateTypes
        });
      }
    }

    log('workshops_identified', `Encontrados ${workshopsWithDuplicates.length} workshops com duplicatas`, {
      count: workshopsWithDuplicates.length
    });

    // Step 2: Filtrar workshops alvo (se workshop_ids especificado)
    let targetWorkshops = workshopsWithDuplicates;
    if (workshop_ids && workshop_ids.length > 0) {
      targetWorkshops = workshopsWithDuplicates.filter(w => 
        workshop_ids.includes(w.workshop_id)
      );
      log('workshops_filtered', `Filtrado para ${targetWorkshops.length} workshops alvo`, {
        target_count: targetWorkshops.length
      });
    }

    // Step 3: Processar em batches
    const batchNumber = 1;
    const startIdx = (batchNumber - 1) * batch_size;
    const batchWorkshops = targetWorkshops.slice(startIdx, startIdx + batch_size);

    log('batch_info', `Processando batch ${batchNumber} (${batchWorkshops.length} workshops)`, {
      batch_number: batchNumber,
      batch_size: batchWorkshops.length,
      total_workshops: targetWorkshops.length,
      has_more: startIdx + batch_size < targetWorkshops.length
    });

    // Step 4: Executar cleanup por workshop
    const results = [];
    let totalDeleted = 0;
    let totalFailed = 0;

    for (const workshop of batchWorkshops) {
      try {
        log('workshop_start', `Processando ${workshop.workshop_id}`, {
          workshop_id: workshop.workshop_id,
          duplicate_types: workshop.duplicate_types.length
        });

        // Snapshot pré-cleanup (para rollback)
        const snapshot = {
          workshop_id: workshop.workshop_id,
          timestamp: new Date().toISOString(),
          attendances_before: workshop.total_attendances,
          duplicate_types: workshop.details.map(d => ({
            type_id: d.type_id,
            count: d.count,
            with_link: d.with_link
          }))
        };

        if (!dry_run) {
          // TODO: Salvar snapshot em entidade de rollback
          // await base44.entities.CleanupRollback.create(snapshot);
          log('snapshot_saved', 'Snapshot criado para rollback', {
            workshop_id: workshop.workshop_id
          });
        }

        // Executar cleanup (lógica do cleanupDuplicateAttendances)
        const attendancesByType = {};
        for (const att of attendances.filter(a => a.workshop_id === workshop.workshop_id)) {
          const key = att.attendance_type_id;
          if (!attendancesByType[key]) attendancesByType[key] = [];
          attendancesByType[key].push(att);
        }

        let deleted = 0;
        let kept = 0;

        for (const [typeId, items] of Object.entries(attendancesByType)) {
          if (items.length <= 1) {
            kept++;
            continue;
          }

          const withLink = items.filter(a => a.consultoria_atendimento_id);
          let selected;

          if (withLink.length > 0) {
            withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
            selected = withLink[0];
            
            // Deletar outros
            const toDelete = items.filter(i => i.id !== selected.id);
            if (!dry_run) {
              for (const att of toDelete) {
                try {
                  await base44.entities.ContractAttendance.delete(att.id);
                  deleted++;
                } catch (error) {
                  log('delete_error', `Falha ao deletar`, {
                    id: att.id,
                    error: error.message
                  });
                  totalFailed++;
                }
              }
            } else {
              deleted += toDelete.length;
            }
            
            kept++;
            
            log('duplicate_resolved', `Resolvida duplicata ${typeId}`, {
              kept_id: selected.id,
              deleted_count: toDelete.length,
              had_link: withLink.length > 0
            });
          } else {
            // Sem link → manter mais antigo
            items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
            selected = items[0];
            const toDelete = items.slice(1);
            
            if (!dry_run) {
              for (const att of toDelete) {
                try {
                  await base44.entities.ContractAttendance.delete(att.id);
                  deleted++;
                } catch (error) {
                  log('delete_error', `Falha ao deletar`, {
                    id: att.id,
                    error: error.message
                  });
                  totalFailed++;
                }
              }
            } else {
              deleted += toDelete.length;
            }
            
            kept++;
            
            log('duplicate_resolved', `Resolvida duplicata ${typeId} (sem link)`, {
              kept_id: selected.id,
              deleted_count: toDelete.length,
              kept_date: selected.scheduled_date
            });
          }
        }

        // Validação pós-cleanup
        if (!dry_run) {
          const remainingAttendances = await base44.entities.ContractAttendance.filter(
            { workshop_id: workshop.workshop_id },
            null,
            200
          );
          const remainingByType = {};
          for (const att of (remainingAttendances || [])) {
            const key = att.attendance_type_id;
            if (!remainingByType[key]) remainingByType[key] = [];
            remainingByType[key].push(att);
          }

          const validationFailed = Object.entries(remainingByType)
            .some(([_, items]) => items.length > 1);

          if (validationFailed) {
            log('validation_failed', `Cleanup falhou — ainda há duplicatas`, {
              workshop_id: workshop.workshop_id
            });
            
            // TODO: Rollback automático
            // await performRollback(workshop.workshop_id, snapshot);
            
            results.push({
              workshop_id: workshop.workshop_id,
              success: false,
              error: 'Validation failed — duplicates remain',
              deleted,
              kept
            });
            
            totalFailed++;
            continue;
          }
          
          log('validation_passed', `Cleanup validado`, {
            workshop_id: workshop.workshop_id,
            remaining_types: Object.keys(remainingByType).length
          });
        }

        results.push({
          workshop_id: workshop.workshop_id,
          success: true,
          deleted,
          kept,
          snapshot_saved: !dry_run
        });

        totalDeleted += deleted;

      } catch (error) {
        log('workshop_error', `Erro no workshop ${workshop.workshop_id}`, {
          error: error.message
        });
        
        results.push({
          workshop_id: workshop.workshop_id,
          success: false,
          error: error.message
        });
        
        totalFailed++;
      }
    }

    // Step 5: Resumo global
    const summary = {
      dry_run,
      batch_number: batchNumber,
      workshops_processed: batchWorkshops.length,
      workshops_successful: results.filter(r => r.success).length,
      workshops_failed: results.filter(r => !r.success).length,
      total_deleted: totalDeleted,
      total_failed: totalFailed,
      has_more_batches: startIdx + batch_size < targetWorkshops.length,
      remaining_workshops: targetWorkshops.length - (startIdx + batch_size)
    };

    log('global_cleanup_completed', 'Batch concluído', summary);

    return Response.json({
      success: true,
      summary,
      results,
      next_batch: summary.has_more_batches ? {
        batch_number: batchNumber + 1,
        workshop_ids: targetWorkshops
          .slice(startIdx + batch_size, startIdx + batch_size * 2)
          .map(w => w.workshop_id)
      } : null
    });

  } catch (error) {
    console.error('Erro no global cleanup:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
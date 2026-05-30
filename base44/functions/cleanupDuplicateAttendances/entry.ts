import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cleanup: Deletar Duplicatas de ContractAttendance
 * 
 * PROBLEMA: repairMigratedAttendances regenerou 2 registros por tipo (duplicatas)
 * SOLUÇÃO: Para cada tipo, manter APENAS o que tem consultoria_atendimento_id
 *          ou o mais antigo se nenhum tiver link
 * 
 * MODO:
 * - dry_run=true (default): apenas reporta o que seria deletado
 * - dry_run=false: deleta efetivamente
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

    const { dry_run = true, workshop_id } = await req.json();

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    log('cleanup_started', 'Iniciando cleanup de duplicatas', { dry_run, workshop_id });

    // Step 1: Buscar todos os ContractAttendance do workshop
    const filterQuery = workshop_id ? { workshop_id } : {};
    const allAttendances = await base44.entities.ContractAttendance.filter(
      filterQuery,
      null,
      500
    );

    // Filtrar migrated
    const attendances = (allAttendances || []).filter(a => 
      a.attendance_type_id && a.attendance_type_id !== 'migrated'
    );

    log('attendances_found', `Encontrados ${attendances.length} atendimentos`, {
      total: attendances.length
    });

    // Step 2: Agrupar por tipo
    const groupedByType = {};
    for (const att of attendances) {
      const key = att.attendance_type_id;
      if (!groupedByType[key]) {
        groupedByType[key] = [];
      }
      groupedByType[key].push(att);
    }

    // Step 3: Identificar duplicatas e selecionar qual manter
    const toDelete = [];
    const toKeep = [];

    for (const [typeId, items] of Object.entries(groupedByType)) {
      if (items.length <= 1) {
        // Sem duplicata
        toKeep.push(items[0]);
        continue;
      }

      // Tem duplicata — selecionar qual manter
      const withLink = items.filter(a => a.consultoria_atendimento_id);
      let selected;

      if (withLink.length > 0) {
        // Priorizar o que tem link (se múltiplos com link, pegar o mais antigo)
        withLink.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
        selected = withLink[0];
        
        // Os outros com link serão deletados (link duplicado)
        const othersWithLink = withLink.slice(1);
        const othersWithoutLink = items.filter(a => !a.consultoria_atendimento_id);
        
        toDelete.push(...othersWithLink, ...othersWithoutLink);
        toKeep.push(selected);
        
        log('duplicate_with_link', `Mantendo ${typeId} com link`, {
          kept_id: selected.id,
          deleted_count: othersWithLink.length + othersWithoutLink.length
        });
      } else {
        // Nenhum tem link → manter o mais antigo
        items.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
        selected = items[0];
        const others = items.slice(1);
        
        toDelete.push(...others);
        toKeep.push(selected);
        
        log('duplicate_without_link', `Mantendo ${typeId} mais antigo`, {
          kept_id: selected.id,
          deleted_count: others.length
        });
      }
    }

    log('summary', `Resumo: ${toKeep.length} para manter, ${toDelete.length} para deletar`, {
      toKeep: toKeep.length,
      toDelete: toDelete.length
    });

    // Step 4: Executar deletions (se dry_run=false)
    let deleted = 0;
    let failed = 0;

    if (!dry_run) {
      for (const att of toDelete) {
        try {
          await base44.entities.ContractAttendance.delete(att.id);
          deleted++;
          log('deleted', `Deletado`, {
            id: att.id,
            type: att.attendance_type_name,
            workshop_id: att.workshop_id
          });
        } catch (error) {
          failed++;
          log('delete_error', `Falha ao deletar`, {
            id: att.id,
            error: error.message
          });
        }
      }
    }

    // Step 5: Resumo final
    const summary = {
      dry_run,
      totalAttendances: attendances.length,
      totalTypes: Object.keys(groupedByType).length,
      duplicateTypes: Object.entries(groupedByType).filter(([_, items]) => items.length > 1).length,
      toDelete: toDelete.length,
      deleted: dry_run ? 0 : deleted,
      failed: dry_run ? 0 : failed,
      toKeep: toKeep.length
    };

    log('cleanup_completed', 'Cleanup concluído', summary);

    return Response.json({
      success: true,
      summary,
      details: {
        toDelete: dry_run ? toDelete.map(a => ({
          id: a.id,
          type: a.attendance_type_name,
          hasLink: !!a.consultoria_atendimento_id,
          scheduled_date: a.scheduled_date
        })).slice(0, 20) : [],
        toKeep: dry_run ? toKeep.map(a => ({
          id: a.id,
          type: a.attendance_type_name,
          hasLink: !!a.consultoria_atendimento_id,
          scheduled_date: a.scheduled_date
        })) : []
      }
    });

  } catch (error) {
    console.error('Erro no cleanup:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
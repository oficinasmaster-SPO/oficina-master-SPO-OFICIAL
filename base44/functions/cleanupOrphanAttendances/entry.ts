import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Cleanup Final: Deletar Órfãos de ContractAttendance
 * 
 * ÓRFÃOS = ContractAttendance que:
 * 1. NÃO são 'migrated'
 * 2. NÃO têm consultoria_atendimento_id
 * 3. NÃO têm correspondência em ConsultoriaAtendimento.realizados
 * 
 * Estes são resíduos de migração que nunca serão consumidos.
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

    const { workshop_id, dry_run = true } = await req.json();

    const log = (event, msg, data = {}) => {
      console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
    };

    log('orphan_cleanup_started', 'Iniciando cleanup de órfãos', {
      workshop_id,
      dry_run
    });

    // Step 1: Buscar todos os ContractAttendance
    const allContractAtt = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const candidates = (allContractAtt || []).filter(c => 
      c.attendance_type_id !== 'migrated' && 
      !c.consultoria_atendimento_id
    );

    log('candidates_found', `Encontrados ${candidates.length} candidatos a órfãos`, {
      count: candidates.length
    });

    // Step 2: Buscar todos os ConsultoriaAtendimento realizados
    const allRealizados = await base44.entities.ConsultoriaAtendimento.filter(
      { workshop_id },
      null,
      500
    );

    const realizados = (allRealizados || []).filter(r => 
      r.status === 'realizado' || r.status === 'concluido'
    );

    log('realizados_found', `Encontrados ${realizados.length} realizados`, {
      count: realizados.length
    });

    // Step 3: Identificar órfãos (sem match)
    const normalize = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
    const orphans = [];

    for (const candidate of candidates) {
      const candidateNome = normalize(candidate.attendance_type_name);
      
      // Procurar match em realizados
      const hasMatch = realizados.some(r => {
        const realizadoNome = normalize(r.tipo_atendimento);
        return realizadoNome === candidateNome || 
               realizadoNome.includes(candidateNome) || 
               candidateNome.includes(realizadoNome);
      });

      if (!hasMatch) {
        orphans.push(candidate);
        log('orphan_identified', `Órfão identificado`, {
          id: candidate.id,
          type: candidate.attendance_type_name,
          scheduled_date: candidate.scheduled_date
        });
      }
    }

    log('orphans_identified', `Total de órfãos: ${orphans.length}`, {
      count: orphans.length
    });

    // Step 4: Deletar órfãos (se dry_run=false)
    let deleted = 0;
    let failed = 0;

    if (!dry_run) {
      for (const orphan of orphans) {
        try {
          await base44.entities.ContractAttendance.delete(orphan.id);
          deleted++;
          log('deleted', `Órfão deletado`, {
            id: orphan.id,
            type: orphan.attendance_type_name
          });
        } catch (error) {
          failed++;
          log('delete_error', `Falha ao deletar`, {
            id: orphan.id,
            error: error.message
          });
        }
      }

      log('cleanup_completed', `Cleanup de órfãos concluído`, {
        deleted,
        failed
      });
    }

    // Step 5: Validação final
    const remainingAttendances = await base44.entities.ContractAttendance.filter(
      { workshop_id },
      null,
      500
    );

    const remainingByType = {};
    for (const att of (remainingAttendances || [])) {
      const key = att.attendance_type_id;
      if (!remainingByType[key]) remainingByType[key] = { total: 0, linked: 0, migrated: 0 };
      remainingByType[key].total++;
      if (att.consultoria_atendimento_id) remainingByType[key].linked++;
      if (att.attendance_type_id === 'migrated') remainingByType[key].migrated++;
    }

    const validationPassed = Object.entries(remainingByType)
      .filter(([_, data]) => data.migrated === 0) // Ignorar migrated
      .every(([_, data]) => data.total === 1);

    log('validation', `Validação: ${validationPassed ? 'PASSOU' : 'FALHOU'}`, {
      passed: validationPassed,
      final_state: remainingByType
    });

    const summary = {
      workshop_id,
      dry_run,
      orphans_identified: orphans.length,
      deleted: dry_run ? 0 : deleted,
      failed: dry_run ? 0 : failed,
      validation: {
        passed: validationPassed,
        final_state: remainingByType
      }
    };

    log('orphan_cleanup_completed', 'Cleanup de órfãos concluído', summary);

    return Response.json({
      success: true,
      summary,
      next_steps: validationPassed ? 
        'ContractAttendance integrity fully restored' : 
        'Manual review required'
    });

  } catch (error) {
    console.error('Erro no orphan cleanup:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
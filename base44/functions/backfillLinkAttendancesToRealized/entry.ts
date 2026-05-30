import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backfill: Link ContractAttendance → ConsultoriaAtendimento
 * 
 * PROBLEMA: repairMigratedAttendances regenerou atendimentos SEM vincular aos realizados
 * SOLUÇÃO: Para cada ConsultoriaAtendimento realizado, encontrar o ContractAttendance
 *          correspondente por attendance_type_name + data mais próxima e atualizar o link
 * 
 * MODO:
 * - dry_run=true (default): apenas reporta o que seria feito
 * - dry_run=false: executa o link efetivamente
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

    log('backfill_started', 'Iniciando backfill de link', { dry_run, workshop_id });

    // Step 1: Buscar ConsultoriaAtendimento realizados do workshop (ou todos se não especificado)
    // Nota: status pode ser 'realizado' ou 'concluido'
    const realizadosFilter = workshop_id ? { workshop_id } : {};
    const todosRealizados = await base44.entities.ConsultoriaAtendimento.filter(
      realizadosFilter,
      '-data_agendada',
      1000
    );
    const realizados = (todosRealizados || []).filter(r => 
      r.status === 'realizado' || r.status === 'concluido'
    );

    log('realizados_found', `Encontrados ${realizados.length} atendimentos realizados`, {
      count: realizados.length
    });

    // Step 2: Para cada realizado, encontrar ContractAttendance correspondente
    const linksToCreate = [];
    const errors = [];

    for (const realizado of realizados) {
      try {
        // Buscar ContractAttendance do workshop do atendimento realizado
        const attFilter = { workshop_id: realizado.workshop_id };
        const allCandidates = await base44.entities.ContractAttendance.filter(attFilter, null, 200);
        
        // Filtrar por similaridade de nome (normalizando underscores e espaços)
        const normalize = (str) => (str || '').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
        const realizadoNome = normalize(realizado.tipo_atendimento);
        const candidates = (allCandidates || []).filter(c => {
          const attendanceNome = normalize(c.attendance_type_name);
          // Match parcial: ex "mentoria performance humana" match "mentoria"
          return attendanceNome.includes(realizadoNome) || realizadoNome.includes(attendanceNome);
        });

        if (!candidates || candidates.length === 0) {
          log('candidate_not_found', `Sem ContractAttendance para ${realizado.tipo_atendimento}`, {
            realizado_id: realizado.id
          });
          continue;
        }

        // Filtrar apenas os SEM link (idempotência)
        const withoutLink = candidates.filter(c => !c.consultoria_atendimento_id);
        
        if (withoutLink.length === 0) {
          log('already_linked', `Já tem link: ${realizado.tipo_atendimento}`, {
            realizado_id: realizado.id
          });
          continue;
        }

        // Ordenar por data mais próxima da realização
        const realizadoDate = new Date(realizado.data_agendada);
        withoutLink.sort((a, b) => {
          const dateA = new Date(a.scheduled_date);
          const dateB = new Date(b.scheduled_date);
          return Math.abs(dateA - realizadoDate) - Math.abs(dateB - realizadoDate);
        });

        // Selecionar o mais próximo
        const selected = withoutLink[0];
        
        linksToCreate.push({
          contract_attendance_id: selected.id,
          consultoria_atendimento_id: realizado.id,
          tipo: realizado.tipo_atendimento,
          workshop_id: realizado.workshop_id,
          scheduled_date: selected.scheduled_date,
          realizado_date: realizado.data_agendada,
          diff_days: Math.round((realizadoDate - new Date(selected.scheduled_date)) / (1000 * 60 * 60 * 24))
        });

      } catch (error) {
        log('error_processing', `Erro ao processar ${realizado.id}`, { error: error.message });
        errors.push({ realizado_id: realizado.id, error: error.message });
      }
    }

    log('links_to_create', `Encontrados ${linksToCreate.length} links para criar`, {
      count: linksToCreate.length
    });

    // Step 3: Deduplicar links — um ConsultoriaAtendimento só pode linkar um ContractAttendance
    const uniqueLinks = [];
    const linkedRealizados = new Set();
    
    for (const link of linksToCreate) {
      if (!linkedRealizados.has(link.consultoria_atendimento_id)) {
        uniqueLinks.push(link);
        linkedRealizados.add(link.consultoria_atendimento_id);
      } else {
        log('duplicate_link_skipped', `Link duplicado ignorado`, link);
      }
    }
    
    log('unique_links', `Links únicos: ${uniqueLinks.length}`, { count: uniqueLinks.length });

    // Step 4: Executar links (se dry_run=false)
    let updated = 0;
    let failed = 0;

    if (!dry_run) {
      for (const link of uniqueLinks) {
        try {
          await base44.entities.ContractAttendance.update(link.contract_attendance_id, {
            consultoria_atendimento_id: link.consultoria_atendimento_id,
            status: 'realizado'
          });
          updated++;
          log('link_created', `Link criado`, link);
        } catch (error) {
          failed++;
          log('link_error', `Falha ao criar link`, { ...link, error: error.message });
        }
      }
    }

    // Step 5: Resumo
    const summary = {
      dry_run,
      realizados_processed: realizados.length,
      links_to_create: linksToCreate.length,
      unique_links: uniqueLinks.length,
      updated: dry_run ? 0 : updated,
      failed: dry_run ? 0 : failed,
      errors: errors.length
    };

    log('backfill_completed', 'Backfill concluído', summary);

    return Response.json({
      success: true,
      summary,
      details: dry_run ? linksToCreate.slice(0, 20) : [], // Preview dos primeiros 20 em dry_run
      errors: errors.slice(0, 10) // Primeiros 10 erros
    });

  } catch (error) {
    console.error('Erro no backfill:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
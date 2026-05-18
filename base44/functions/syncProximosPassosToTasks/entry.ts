import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * QA FIX: Sync de próximos passos com proteção total contra duplicatas.
 * - Usa item_id_hash como chave de idempotência no ConsultoriaProximoPasso
 * - Busca por AMBOS ata_id E consultoria_atendimento_id para detectar duplicatas cross-field
 * - Nunca insere um passo se já existir com mesmo hash OU mesmo título+workshop+prazo
 */

async function generateHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ata_id, ata_data, workshop_id, consultor_id, consulting_firm_id } = await req.json();

    if (!ata_id || !ata_data || !workshop_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const proximosPassos = ata_data.proximos_passos_list || [];
    const createdTasks = [];
    const existingTaskIds = new Set();

    // ── FASE 1: Sync CronogramaImplementacao ──────────────────────────────────
    const ataTasks = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      ata_origem_id: ata_id
    });
    
    ataTasks.forEach(task => existingTaskIds.add(task.item_id));

    for (const passo of proximosPassos) {
      if (!passo?.descricao) continue;

      const contentToHash = `${passo.descricao}|${passo.responsavel || 'sem-responsavel'}|${passo.prazo || 'sem-prazo'}`;
      const passoHash = await generateHash(contentToHash);
      const taskId = `ata-${ata_id}-${passoHash}`;

      const existingTask = ataTasks.find(t => t.item_id === taskId);

      if (existingTask) {
        await base44.asServiceRole.entities.CronogramaImplementacao.update(existingTask.id, {
          item_nome: passo.descricao,
          status: passo.status || 'a_fazer',
          data_termino_previsto: passo.prazo
            ? new Date(passo.prazo).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          observacoes: `Responsável: ${passo.responsavel || 'Não definido'}`
        });
      } else {
        const newTask = await base44.asServiceRole.entities.CronogramaImplementacao.create({
          workshop_id,
          item_id: taskId,
          item_nome: passo.descricao,
          item_tipo: 'proximo_passo_ata',
          status: passo.status || 'a_fazer',
          data_inicio_real: new Date().toISOString(),
          data_termino_previsto: passo.prazo
            ? new Date(passo.prazo).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          observacoes: `Responsável: ${passo.responsavel || 'Não definido'}`,
          ata_origem_id: ata_id
        });
        createdTasks.push(newTask.id);
      }
      existingTaskIds.add(taskId);
    }

    const orphanedTasks = ataTasks.filter(t => !existingTaskIds.has(t.item_id));
    for (const orphan of orphanedTasks) {
      await base44.asServiceRole.entities.CronogramaImplementacao.delete(orphan.id);
    }

    // ── FASE 2: Sync ConsultoriaProximoPasso ──────────────────────────────────
    // QA FIX: Buscar por AMBAS as chaves de vínculo para detectar qualquer duplicata existente
    const createdPassos = [];
    if (consulting_firm_id || workshop_id) {

      // Buscar por ata_id (criação via gerarAtaConsultoria ou onMeetingMinutesUpdate)
      const existingByAtaId = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
        ata_id: ata_id
      }).catch(() => []);

      // Buscar por consultoria_atendimento_id (criação legada)
      const existingByAtendimentoId = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
        consultoria_atendimento_id: ata_id
      }).catch(() => []);

      // Unir todos em um Set de hashes conhecidos + chaves de duplicata por título
      const allExisting = [...existingByAtaId, ...existingByAtendimentoId];
      const existingHashes = new Set();
      const existingTitleKeys = new Set(); // fallback para registros sem hash

      allExisting.forEach(p => {
        if (p.item_id_hash) existingHashes.add(p.item_id_hash);
        // Chave de título normalizado como proteção extra
        const titleKey = `${p.workshop_id}|${(p.titulo || '').toLowerCase().trim()}|${(p.prazo || '')}`;
        existingTitleKeys.add(titleKey);
      });

      for (const passo of proximosPassos) {
        if (!passo?.descricao) continue;

        const contentToHash = `${passo.descricao}|${passo.responsavel || ''}|${passo.prazo || ''}`;
        const passoHash = await generateHash(contentToHash);
        const titleKey = `${workshop_id}|${passo.descricao.toLowerCase().trim()}|${passo.prazo || ''}`;

        // ✅ Verificar por hash OU por título/data (dupla proteção)
        if (existingHashes.has(passoHash) || existingTitleKeys.has(titleKey)) {
          console.log(`⚠️ Passo já existe (hash=${passoHash}), pulando: "${passo.descricao.substring(0, 40)}"`);
          continue;
        }

        const now = new Date().toISOString();
        const newPasso = await base44.asServiceRole.entities.ConsultoriaProximoPasso.create({
          workshop_id,
          consulting_firm_id: consulting_firm_id || null,
          consultoria_atendimento_id: ata_id,
          ata_id: ata_id,
          consultor_id: consultor_id || null,
          titulo: passo.descricao,
          responsavel_nome: passo.responsavel || null,
          prazo: passo.prazo || null,
          status: 'pendente',
          percentual_execucao: 0,
          prioridade: 'media',
          origem: 'ata',
          item_id_hash: passoHash,
          historico: [{
            tipo: 'criacao',
            descricao: 'Próximo passo criado via ATA',
            created_at: now
          }]
        });
        createdPassos.push(newPasso.id);

        // Adicionar ao set para evitar duplicata no mesmo batch
        existingHashes.add(passoHash);
        existingTitleKeys.add(titleKey);
      }
    }

    return Response.json({
      success: true,
      message: `${createdTasks.length} tarefa(s) criada(s), ${orphanedTasks.length} removida(s), ${createdPassos.length} passo(s) operacional(is) criado(s)`,
      tasksCreated: createdTasks,
      tasksRemoved: orphanedTasks.length,
      passosCreated: createdPassos
    });
  } catch (error) {
    console.error('Erro ao sincronizar próximos passos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
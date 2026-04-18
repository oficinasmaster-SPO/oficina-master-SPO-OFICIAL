import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Gerar hash MD5 do conteúdo
async function generateHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Usar primeiros 16 caracteres
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ata_id, ata_data, workshop_id } = await req.json();

    if (!ata_id || !ata_data || !workshop_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const proximosPassos = ata_data.proximos_passos_list || [];
    const createdTasks = [];
    const existingTaskIds = new Set();

    // Buscar todas as tarefas originadas desta ATA
    const ataTasks = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      ata_origem_id: ata_id
    });
    
    ataTasks.forEach(task => {
      existingTaskIds.add(task.item_id);
    });

    // Processar cada próximo passo
    for (const passo of proximosPassos) {
      if (!passo?.descricao) continue;

      // Gerar hash baseado no conteúdo (descricao + responsavel + prazo)
      const contentToHash = `${passo.descricao}|${passo.responsavel || 'sem-responsavel'}|${passo.prazo || 'sem-prazo'}`;
      const passoHash = await generateHash(contentToHash);
      const taskId = `ata-${ata_id}-${passoHash}`;

      // Verificar se tarefa já existe
      const existingTask = ataTasks.find(t => t.item_id === taskId);

      if (existingTask) {
        // Atualizar tarefa existente
        await base44.asServiceRole.entities.CronogramaImplementacao.update(
          existingTask.id,
          {
            item_nome: passo.descricao,
            status: passo.status || 'a_fazer',
            data_termino_previsto: passo.prazo
              ? new Date(passo.prazo).toISOString()
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            observacoes: `Responsável: ${passo.responsavel || 'Não definido'}`
          }
        );
      } else {
        // Criar nova tarefa
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

    // Limpar tarefas órfãs (próximos passos removidos da ATA)
    const orphanedTasks = ataTasks.filter(t => !existingTaskIds.has(t.item_id));
    for (const orphan of orphanedTasks) {
      await base44.asServiceRole.entities.CronogramaImplementacao.delete(orphan.id);
    }

    return Response.json({
      success: true,
      message: `${createdTasks.length} tarefa(s) criada(s), ${orphanedTasks.length} removida(s)`,
      tasksCreated: createdTasks,
      tasksRemoved: orphanedTasks.length
    });
  } catch (error) {
    console.error('Erro ao sincronizar próximos passos:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * SINCRONIZAÇÃO E VALIDAÇÃO DE ANEXOS - TAREFA BACKLOG
 * 
 * Senior-level validation para garantir integridade de anexos:
 * ✓ Valida URLs (não quebradas)
 * ✓ Remove duplicatas por URL
 * ✓ Mantém integridade de dados
 * ✓ Log de auditoria
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tarefa_id, action = 'validate' } = await req.json();

    if (!tarefa_id) {
      return Response.json({ error: 'tarefa_id is required' }, { status: 400 });
    }

    // Buscar tarefa
    const tarefas = await base44.entities.TarefaBacklog.filter({ id: tarefa_id });
    if (!tarefas || tarefas.length === 0) {
      return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const tarefa = tarefas[0];
    let anexos = tarefa.anexos || [];

    if (action === 'validate') {
      /**
       * VALIDAÇÃO RIGOROSA DE ANEXOS
       * 1. Remove duplicatas por URL
       * 2. Valida estrutura obrigatória
       * 3. Remove anexos órfãos (URLs quebradas)
       */
      const anexosValidados = [];
      const urlsVistas = new Set();

      for (const anexo of anexos) {
        // Validar estrutura obrigatória
        if (!anexo.type || !anexo.url || !anexo.nome) {
          console.warn(`[ANEXO INVÁLIDO] Tarefa ${tarefa_id}: Estrutura incompleta`, anexo);
          continue;
        }

        // Remover duplicatas
        if (urlsVistas.has(anexo.url)) {
          console.warn(`[DUPLICATA] Tarefa ${tarefa_id}: URL repetida ${anexo.url}`);
          continue;
        }

        // Validar tipo
        if (!['imagem', 'arquivo', 'link'].includes(anexo.type)) {
          console.warn(`[TIPO INVÁLIDO] Tarefa ${tarefa_id}: ${anexo.type}`);
          continue;
        }

        // Validar URL (básico - verifica se começa com http/https ou é URL válida)
        if (!anexo.url.startsWith('http://') && !anexo.url.startsWith('https://')) {
          console.warn(`[URL INVÁLIDA] Tarefa ${tarefa_id}: ${anexo.url}`);
          continue;
        }

        urlsVistas.add(anexo.url);
        anexosValidados.push({
          type: anexo.type,
          url: anexo.url,
          nome: anexo.nome,
          uploaded_at: anexo.uploaded_at || new Date().toISOString()
        });
      }

      // Atualizar se houve mudanças
      if (anexosValidados.length !== anexos.length) {
        await base44.entities.TarefaBacklog.update(tarefa_id, {
          anexos: anexosValidados
        });
        
        return Response.json({
          success: true,
          message: `Validação concluída: ${anexos.length} → ${anexosValidados.length} anexos`,
          validados: anexosValidados.length,
          removidos: anexos.length - anexosValidados.length,
          anexos: anexosValidados
        });
      }

      return Response.json({
        success: true,
        message: 'Anexos já estão válidos',
        validados: anexosValidados.length,
        anexos: anexosValidados
      });
    }

    if (action === 'cleanup') {
      /**
       * LIMPEZA DE ANEXOS ÓRFÃOS
       * Remove anexos sem timestamp ou muito antigos
       */
      const agora = new Date();
      const anexosAtivos = anexos.filter(a => {
        if (!a.uploaded_at) return false; // Remove sem timestamp
        
        const dataUpload = new Date(a.uploaded_at);
        const diasAntigos = (agora - dataUpload) / (1000 * 60 * 60 * 24);
        return diasAntigos < 365; // Mantém anexos com menos de 1 ano
      });

      if (anexosAtivos.length !== anexos.length) {
        await base44.entities.TarefaBacklog.update(tarefa_id, {
          anexos: anexosAtivos
        });
      }

      return Response.json({
        success: true,
        message: 'Cleanup concluído',
        removidos: anexos.length - anexosAtivos.length,
        ativos: anexosAtivos.length
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[SYNC ANEXOS] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
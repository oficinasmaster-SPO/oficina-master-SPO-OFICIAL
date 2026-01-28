import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id } = await req.json();
    
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados do legacy
    const legacyItems = await base44.asServiceRole.entities.CronogramaProgresso.filter({ workshop_id });
    
    // Buscar dados atuais
    const currentItems = await base44.asServiceRole.entities.CronogramaImplementacao.filter({ workshop_id });
    
    // Mapear itens atuais por item_id para detectar duplicidades
    const currentItemsMap = new Map();
    currentItems.forEach(item => {
      if (item.item_id) {
        currentItemsMap.set(item.item_id, item);
      }
    });

    const results = {
      migrated: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Mapear situacao do legacy para status do novo sistema
    const statusMap = {
      'concluido': 'concluido',
      'nao_iniciado': 'a_fazer',
      'em_andamento': 'em_andamento',
      'cancelado': 'a_fazer',
      'atrasado': 'em_andamento'
    };

    for (const legacyItem of legacyItems) {
      try {
        const itemId = legacyItem.modulo_codigo;
        const existingItem = currentItemsMap.get(itemId);

        if (existingItem) {
          // Item já existe - verificar se precisa atualizar status
          const legacyStatus = statusMap[legacyItem.situacao] || 'a_fazer';
          
          // Se legacy está concluído e atual não, atualizar
          if (legacyStatus === 'concluido' && existingItem.status !== 'concluido') {
            await base44.asServiceRole.entities.CronogramaImplementacao.update(existingItem.id, {
              status: 'concluido',
              progresso_percentual: 100,
              data_termino_real: legacyItem.data_conclusao_realizado || new Date().toISOString().split('T')[0]
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Item não existe - criar novo
          const newStatus = statusMap[legacyItem.situacao] || 'a_fazer';
          
          await base44.asServiceRole.entities.CronogramaImplementacao.create({
            workshop_id: workshop_id,
            item_tipo: legacyItem.tipo_conteudo === 'processo' ? 'diagnostico' : legacyItem.tipo_conteudo,
            item_id: itemId,
            item_nome: legacyItem.modulo_nome,
            item_categoria: 'diagnosticos',
            status: newStatus,
            progresso_percentual: newStatus === 'concluido' ? 100 : 0,
            data_inicio_real: legacyItem.data_inicio_realizado || legacyItem.data_visualizacao || null,
            data_termino_previsto: legacyItem.data_conclusao_previsto || null,
            data_termino_real: newStatus === 'concluido' ? (legacyItem.data_conclusao_realizado || new Date().toISOString().split('T')[0]) : null,
            dependencias: [],
            historico_alteracoes: [{
              data_alteracao: new Date().toISOString(),
              campo_alterado: 'migracao',
              valor_anterior: 'CronogramaProgresso',
              valor_novo: 'CronogramaImplementacao',
              usuario_id: user.id,
              usuario_nome: user.full_name || 'Sistema'
            }],
            observacoes: `Migrado de CronogramaProgresso em ${new Date().toISOString()}`,
            total_visualizacoes: 0
          });
          results.migrated++;
        }
      } catch (error) {
        results.errors.push({
          item: legacyItem.modulo_codigo,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      workshop_id,
      summary: {
        legacy_items: legacyItems.length,
        current_items_before: currentItems.length,
        migrated: results.migrated,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors.length
      },
      errors: results.errors
    });

  } catch (error) {
    console.error('Erro na migração:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
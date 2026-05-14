import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * LIMPEZA DE PRÓXIMOS PASSOS DUPLICADOS
 * 
 * Identifica e remove duplicatas em ConsultoriaProximoPasso baseado em:
 * - workshop_id
 * - titulo (hash)
 * - responsavel_nome (hash)
 * - prazo
 * - origem = 'ata'
 * 
 * Mantém SEMPRE o mais antigo (primeiro criado), remove os demais.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem rodar cleanup' }, { status: 403 });
    }

    console.log('🔧 Iniciando cleanup de próximos passos duplicados...');

    // 1. Buscar todos próximos passos de origem 'ata'
    const todosPPs = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
      origem: 'ata'
    }, 'created_date', 1000);

    console.log(`📊 Total de próximos passos "ata": ${todosPPs.length}`);

    // 2. Agrupar por chave de duplicação (workshop_id + hash do titulo + responsavel + prazo)
    const grupos = {};
    
    for (const pp of todosPPs) {
      // Gerar hash do título (normalizado)
      const tituloNormalizado = (pp.titulo || '').toLowerCase().trim();
      const responsavelNormalizado = (pp.responsavel_nome || '').toLowerCase().trim();
      const prazo = pp.prazo || 'sem-prazo';
      
      const chave = `${pp.workshop_id}|${tituloNormalizado}|${responsavelNormalizado}|${prazo}`;
      
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(pp);
    }

    // 3. Identificar duplicatas
    let totalDuplicatas = 0;
    const idsParaRemover = [];
    const idsParaManter = [];

    for (const [chave, grupo] of Object.entries(grupos)) {
      if (grupo.length > 1) {
        // Ordenar por created_date (mais antigo primeiro)
        grupo.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        // Manter o primeiro (mais antigo)
        idsParaManter.push(grupo[0].id);
        
        // Marcar restantes para remoção
        for (let i = 1; i < grupo.length; i++) {
          idsParaRemover.push(grupo[i].id);
          totalDuplicatas++;
        }
        
        console.log(`⚠️ Duplicata: "${grupo[0].titulo?.substring(0, 40)}..." (${grupo.length} cópias)`);
      }
    }

    console.log(`📈 Total de duplicatas identificadas: ${totalDuplicatas}`);
    console.log(`💾 IDs para manter: ${idsParaManter.length}`);
    console.log(`🗑️  IDs para remover: ${idsParaRemover.length}`);

    // 4. Remover duplicatas (em batches de 50 para não estourar timeout)
    let totalRemovidos = 0;
    let totalErros = 0;

    for (let i = 0; i < idsParaRemover.length; i += 50) {
      const batch = idsParaRemover.slice(i, i + 50);
      
      try {
        await Promise.all(
          batch.map(id => 
            base44.asServiceRole.entities.ConsultoriaProximoPasso.delete(id)
              .then(() => {
                totalRemovidos++;
                console.log(`✅ Removido: ${id}`);
              })
              .catch(err => {
                totalErros++;
                console.error(`❌ Erro ao remover ${id}:`, err.message);
              })
          )
        );
        
        // Aguardar 100ms entre batches para evitar rate limit
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`❌ Erro no batch ${i}:`, err.message);
      }
    }

    // 5. Resumo final
    const resumo = {
      sucesso: true,
      totalEncontrados: todosPPs.length,
      totalDuplicatasIdentificadas: totalDuplicatas,
      totalRemovidos: totalRemovidos,
      totalErros: totalErros,
      totalMantidos: idsParaManter.length,
      mensagem: `Cleanup concluído: ${totalRemovidos} duplicatas removidas de ${totalDuplicatas} identificadas`,
    };

    console.log('✅ CLEANUP CONCLUÍDO:', resumo);

    return Response.json(resumo);
  } catch (error) {
    console.error('Erro crítico no cleanup:', error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});
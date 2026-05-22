import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { workshop_id } = body;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar todos os lançamentos DRE da oficina
    const todosLancamentos = await base44.asServiceRole.entities.DRELancamento.filter({
      workshop_id: workshop_id
    });

    console.log(`Total de lançamentos encontrados: ${todosLancamentos.length}`);

    // Agrupar lançamentos por (descricao, valor, data_vencimento)
    const grupos = new Map();
    
    for (const lancamento of todosLancamentos) {
      if (!lancamento.data_vencimento || !lancamento.descricao) continue;
      
      const chave = `${lancamento.descricao}|${lancamento.valor}|${lancamento.data_vencimento}`;
      
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave).push(lancamento);
    }

    console.log(`Grupos identificados: ${grupos.size}`);

    const correcoes = [];
    const erros = [];

    // Processar cada grupo com duplicatas
    for (const [chave, lancamentos] of grupos.entries()) {
      if (lancamentos.length <= 1) continue; // Sem duplicatas

      const [descricao, valor, dataVencimentoBase] = chave.split('|');
      console.log(`\nProcessando: ${descricao} | Valor: ${valor} | Duplicatas: ${lancamentos.length}`);

      // Manter o primeiro para maio/2026 (ou mês original)
      const dataBase = new Date(dataVencimentoBase);
      const anoBase = dataBase.getFullYear();
      const mesBase = dataBase.getMonth(); // 0-11
      const diaBase = dataBase.getDate();

      // Ordenar por data de criação para manter o mais antigo
      lancamentos.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );

      // Manter o primeiro como está (mês original)
      const mantido = lancamentos[0];
      correcoes.push({
        acao: 'mantido',
        id: mantido.id,
        descricao: mantido.descricao,
        data_vencimento: mantido.data_vencimento,
        mes: mantido.mes
      });

      // Redistribuir os demais
      for (let i = 1; i < lancamentos.length; i++) {
        const lancamento = lancamentos[i];
        
        // Calcular novo mês (mês base + i)
        const novoMes = new Date(anoBase, mesBase + i, diaBase);
        const novaDataVencimento = novoMes.toISOString().split('T')[0];
        const novoMesRef = `${novoMes.getFullYear()}-${String(novoMes.getMonth() + 1).padStart(2, '0')}`;

        try {
          // Atualizar o lançamento com nova data e mês
          await base44.asServiceRole.entities.DRELancamento.update(lancamento.id, {
            data_vencimento: novaDataVencimento,
            mes: novoMesRef,
            parcela_atual: i + 1,
            numero_parcelas: lancamentos.length
          });

          correcoes.push({
            acao: 'atualizado',
            id: lancamento.id,
            descricao: lancamento.descricao,
            data_vencimento_antiga: lancamento.data_vencimento,
            data_vencimento_nova: novaDataVencimento,
            mes_antigo: lancamento.mes,
            mes_novo: novoMesRef,
            parcela_atual: i + 1
          });

          console.log(`  ✓ Parcela ${i + 1}: ${lancamento.data_vencimento} → ${novaDataVencimento} (${novoMesRef})`);
        } catch (error) {
          console.error(`  ✗ Erro ao atualizar ${lancamento.id}:`, error.message);
          erros.push({
            id: lancamento.id,
            descricao: lancamento.descricao,
            erro: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      resumo: {
        total_lancamentos: todosLancamentos.length,
        grupos_processados: grupos.size,
        correcoes_realizadas: correcoes.length,
        mantidos: correcoes.filter(c => c.acao === 'mantido').length,
        atualizados: correcoes.filter(c => c.acao === 'atualizado').length,
        erros: erros.length
      },
      correcoes,
      erros
    });

  } catch (error) {
    console.error('Erro na correção:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});
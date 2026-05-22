import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação Entity: Quando um DRELancamento é deletado,
 * deleta as Contas a Receber/Pagar correspondentes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { event, data } = payload;

    // Apenas processa deletions
    if (event.type !== 'delete') {
      return Response.json({ status: 'skipped', reason: 'not_a_delete_event' });
    }

    const dreLancamentoId = event.entity_id;
    const workshopId = data?.workshop_id;

    if (!dreLancamentoId || !workshopId) {
      return Response.json({ 
        status: 'error', 
        message: 'Missing dreLancamentoId or workshopId' 
      }, { status: 400 });
    }

    // ✅ STEP 1: Buscar Contas a Receber vinculadas
    const contasReceber = await base44.asServiceRole.entities.ContaReceber.filter({
      dre_lancamento_id: dreLancamentoId,
      workshop_id: workshopId
    });

    // ✅ STEP 2: Buscar Contas a Pagar vinculadas
    const contasPagar = await base44.asServiceRole.entities.ContaPagar.filter({
      dre_lancamento_id: dreLancamentoId,
      workshop_id: workshopId
    });

    let deletedReceber = 0;
    let deletedPagar = 0;

    // ✅ STEP 3: Deletar Contas a Receber e suas Liquidações
    for (const conta of contasReceber) {
      // Deletar liquidações primeiro
      const liquidacoes = await base44.asServiceRole.entities['LiquidaçãoFinanceira'].filter({
        conta_receber_id: conta.id,
        workshop_id: workshopId
      });
      
      for (const liq of liquidacoes) {
        await base44.asServiceRole.entities['LiquidaçãoFinanceira'].delete(liq.id);
      }

      // Deletar conta
      await base44.asServiceRole.entities.ContaReceber.delete(conta.id);
      deletedReceber++;
    }

    // ✅ STEP 4: Deletar Contas a Pagar e suas Liquidações
    for (const conta of contasPagar) {
      // Deletar liquidações primeiro
      const liquidacoes = await base44.asServiceRole.entities['LiquidaçãoFinanceira'].filter({
        conta_pagar_id: conta.id,
        workshop_id: workshopId
      });
      
      for (const liq of liquidacoes) {
        await base44.asServiceRole.entities['LiquidaçãoFinanceira'].delete(liq.id);
      }

      // Deletar conta
      await base44.asServiceRole.entities.ContaPagar.delete(conta.id);
      deletedPagar++;
    }

    return Response.json({
      status: 'success',
      message: `Sincronismo DRE Delete: ${deletedReceber} Contas a Receber e ${deletedPagar} Contas a Pagar foram deletadas`,
      dreLancamentoId,
      deletedReceber,
      deletedPagar,
      totalLiquidacoesDeletadas: deletedReceber + deletedPagar
    });

  } catch (error) {
    console.error('Error in syncDREDeleteToContas:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
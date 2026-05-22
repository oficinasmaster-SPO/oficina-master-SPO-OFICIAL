import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação Entity: Quando uma ContaReceber ou ContaPagar é deletada,
 * deleta o DRELancamento correspondente (sincronismo reverso)
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

    const contaId = event.entity_id;
    const entityName = event.entity_name; // ContaReceber ou ContaPagar
    const dreLancamentoId = data?.dre_lancamento_id;
    const workshopId = data?.workshop_id;

    if (!dreLancamentoId || !workshopId) {
      return Response.json({ 
        status: 'skipped', 
        message: 'Conta sem vínculo com DRE' 
      });
    }

    // Deletar DRELancamento vinculado
    await base44.asServiceRole.entities.DRELancamento.delete(dreLancamentoId);

    console.log(`[SYNC] ${entityName} ${contaId} deletada → DRELancamento ${dreLancamentoId} deletado`);

    return Response.json({
      status: 'success',
      message: `Conta deletada → DRE sincronizado`,
      contaId,
      entityName,
      dreLancamentoId
    });

  } catch (error) {
    console.error('Error in syncContasDeleteToDRE:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
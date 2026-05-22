import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Aplica sazonalidade na meta anual
 * Calcula meta mensal baseada no peso sazonal configurado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, meta_anual, sazonalidade_config } = await req.json();

    if (!workshop_id || !meta_anual || !sazonalidade_config) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: workshop_id, meta_anual, sazonalidade_config' 
      }, { status: 400 });
    }

    // Validar soma dos pesos (deve ser 1.00 ou muito próximo)
    const somaPesos = Object.values(sazonalidade_config).reduce((acc, val) => acc + val, 0);
    if (Math.abs(somaPesos - 1.00) > 0.01) {
      return Response.json({ 
        error: `Soma dos pesos deve ser 1.00 (atual: ${somaPesos.toFixed(4)})`,
        soma_pesos: somaPesos
      }, { status: 400 });
    }

    // Calcular metas mensais com sazonalidade
    const metas_mensais = {};
    for (const [mes, peso] of Object.entries(sazonalidade_config)) {
      metas_mensais[mes] = {
        peso: peso,
        valor: meta_anual * peso,
        percentual: (peso * 100).toFixed(2)
      };
    }

    return Response.json({
      meta_anual,
      sazonalidade_config,
      metas_mensais,
      soma_pesos: somaPesos.toFixed(4)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
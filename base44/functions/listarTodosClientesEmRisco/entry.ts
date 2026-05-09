import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os workshops
    const workshops = await base44.asServiceRole.entities.Workshop.filter({}, '-updated_date', 1000);
    
    console.log('[listarTodosClientesEmRisco] Total de workshops encontrados:', workshops.length);

    const clientesEmRiscoGlobal = {};
    let totalRiscos = 0;

    // Para cada workshop, buscar riscos
    for (const workshop of workshops) {
      try {
        const response = await base44.asServiceRole.functions.invoke('getRiscosOportunidadesAnalise', {
          workshop_id: workshop.id
        });

        if (response.data && response.data.consolidacao) {
          // Consolidar todos os clientes
          Object.entries(response.data.consolidacao).forEach(([clientId, cliente]) => {
            if (!clientesEmRiscoGlobal[clientId]) {
              clientesEmRiscoGlobal[clientId] = {
                id: cliente.id,
                name: cliente.name,
                riscos: []
              };
            }
            // Adicionar riscos deste workshop
            if (cliente.riscos && cliente.riscos.length > 0) {
              clientesEmRiscoGlobal[clientId].riscos.push(...cliente.riscos);
              totalRiscos += cliente.riscos.length;
            }
          });
        }
      } catch (error) {
        console.warn(`[listarTodosClientesEmRisco] Erro ao processar workshop ${workshop.id}:`, error.message);
      }
    }

    const clientesLista = Object.values(clientesEmRiscoGlobal);
    const totalClientesEmRisco = clientesLista.length;

    console.log('[listarTodosClientesEmRisco] Resultado final:', {
      workshops_processados: workshops.length,
      clientes_em_risco: totalClientesEmRisco,
      total_riscos: totalRiscos
    });

    return Response.json({
      clientes: clientesLista,
      estatisticas: {
        total_workshops: workshops.length,
        total_clientes_em_risco: totalClientesEmRisco,
        total_riscos: totalRiscos
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[listarTodosClientesEmRisco] Erro:', error);
    return Response.json({ 
      error: error.message,
      clientes: [],
      estatisticas: { total_workshops: 0, total_clientes_em_risco: 0, total_riscos: 0 }
    }, { status: 500 });
  }
});
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
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const defaultAreas = [
      { name: "Vendas", description: "Processos de venda e atendimento", order: 1 },
      { name: "Comercial", description: "Prospecção e relacionamento comercial", order: 2 },
      { name: "Pátio", description: "Gestão do pátio e distribuição de serviços", order: 3 },
      { name: "Financeiro", description: "Controles financeiros e DRE", order: 4 },
      { name: "RH", description: "Pessoas e recursos humanos", order: 5 },
      { name: "Marketing", description: "Marketing e comunicação", order: 6 },
      { name: "Geral", description: "Processos gerais e administrativos", order: 7 }
    ];

    const created = [];

    for (const areaData of defaultAreas) {
      const area = await base44.asServiceRole.entities.ProcessArea.create({
        ...areaData,
        workshop_id: workshop_id,
        is_system: true
      });
      created.push(area);
    }

    return Response.json({ success: true, areas: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
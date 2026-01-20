import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gera ID sequencial para novo workshop: OM01, OM02, etc
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar todas as oficinas para contar quantas existem
    const allWorkshops = await base44.asServiceRole.entities.Workshop.list();
    
    // Contar quantas já têm identificador customizado
    let maxNumber = 0;
    if (Array.isArray(allWorkshops)) {
      allWorkshops.forEach(ws => {
        if (ws.identificador && ws.identificador.startsWith('OM')) {
          const num = parseInt(ws.identificador.substring(2));
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    }

    const nextNumber = maxNumber + 1;
    const workshopId = `OM${String(nextNumber).padStart(2, '0')}`;

    console.log(`✅ Novo ID de workshop gerado: ${workshopId}`);

    return Response.json({ 
      success: true,
      workshop_id: workshopId
    });

  } catch (error) {
    console.error("❌ Erro ao gerar ID:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
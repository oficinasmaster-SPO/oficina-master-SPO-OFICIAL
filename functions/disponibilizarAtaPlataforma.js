import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { atendimento_id } = await req.json();

    await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
      ata_disponivel_plataforma,
      ata_gerada_em Date().toISOString()
    });

    return Response.json({
      success,
      message: 'Ata disponibilizada na plataforma para o cliente'
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});

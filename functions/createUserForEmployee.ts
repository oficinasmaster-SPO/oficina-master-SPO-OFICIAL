import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_data, workshop_id, employee_id } = await req.json();

    if (!employee_data || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // A entidade User é built-in e gerenciada pelo sistema de autenticação
    // Quando o colaborador receber o convite e criar senha, o User será criado automaticamente
    // Por enquanto, retornamos sucesso e marcamos que o user será criado no primeiro acesso
    
    return Response.json({
      success: true,
      user_id: null,
      message: 'Colaborador registrado. User será criado quando aceitar o convite.'
    });

  } catch (error) {
    console.error("Error in createUserForEmployee:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
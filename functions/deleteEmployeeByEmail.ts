import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    console.log(`Deletando Employee com email: ${email}`);

    // Buscar todos os Employees com este email
    const employees = await base44.asServiceRole.entities.Employee.list();
    const toDelete = employees.filter(e => e.email === email);

    if (toDelete.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Nenhum Employee encontrado com este email' 
      });
    }

    // Deletar cada um
    for (const emp of toDelete) {
      await base44.asServiceRole.entities.Employee.delete(emp.id);
      console.log(`✅ Deletado Employee ID: ${emp.id}`);
    }

    return Response.json({
      success: true,
      deleted_count: toDelete.length,
      message: `${toDelete.length} Employee(s) deletado(s) com sucesso`
    });

  } catch (error) {
    console.error("Erro ao deletar Employee:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
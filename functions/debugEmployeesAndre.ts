import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Listar últimos 10 employees criados
    console.log("🔍 Listando últimos employees...");
    const employees = await base44.asServiceRole.entities.Employee.list('-created_date', 10);
    
    const found = employees.map(e => ({
        id: e.id, 
        email: e.email, 
        user_id: e.user_id, 
        name: e.full_name,
        role: e.job_role
    }));
    
    console.log("📋 Employees recentes:", found);

    // Tentar buscar especificamente o user_id alvo
    const targetUserId = "698b3434bf896f59ccaaac94";
    const targetEmail = "andrehenri9@gmail.com";
    
    const specificSearch = employees.find(e => e.user_id === targetUserId || e.email === targetEmail);

    if (specificSearch) {
        console.log("✅ Encontrado na lista:", specificSearch);
        
        // Se encontrou, vamos atualizar aqui mesmo
        await base44.asServiceRole.entities.Employee.update(specificSearch.id, {
            job_role: "administrativo",
            area: "administrativo",
            position: "Administrativo"
        });
        return Response.json({ success: true, message: "Atualizado via debug", employee: specificSearch });
    }

    return Response.json({ employees: found });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
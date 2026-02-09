import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gera ID sequencial para novo colaborador dentro de uma oficina
 * Formato: [workshop_id]-[número_sequencial]
 * Exemplo-01, OM01-02, OM02-01
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { workshop_id } = body;

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    // Buscar todos os colaboradores dessa oficina
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      workshop_id 
    });

    // Contar quantos já têm identificador customizado
    let maxNumber = 0;
    if (Array.isArray(employees)) {
      employees.forEach(emp => {
        if (emp.identificador && emp.identificador.startsWith(workshop_id)) {
          const parts = emp.identificador.split('-');
          if (parts.length === 2) {
            const num = parseInt(parts[1]);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });
    }

    const nextNumber = maxNumber + 1;
    const employeeId = `${workshop_id}-${String(nextNumber).padStart(2, '0')}`;

    console.log(`✅ Novo ID de colaborador gerado: ${employeeId}`);

    return Response.json({ 
      success,
      employee_id
    });

  } catch (error) {
    console.error("❌ Erro ao gerar ID:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});

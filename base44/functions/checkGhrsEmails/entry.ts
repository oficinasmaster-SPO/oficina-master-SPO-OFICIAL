import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar usuários (limite 1000 para garantir que pegamos todos os recentes/relevantes)
        const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
        const ghrsUsers = users.filter(u => u.email && u.email.toLowerCase().startsWith('ghrs'));
        
        // Buscar employees
        const employees = await base44.asServiceRole.entities.Employee.list('-created_date', 1000);
        const ghrsEmployees = employees.filter(e => e.email && e.email.toLowerCase().startsWith('ghrs'));

        return Response.json({
            users: {
                count: ghrsUsers.length,
                emails: ghrsUsers.map(u => u.email)
            },
            employees: {
                count: ghrsEmployees.length,
                emails: ghrsEmployees.map(e => e.email)
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
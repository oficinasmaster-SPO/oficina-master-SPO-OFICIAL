import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar dados com limite aumentado para garantir contagem correta
        // Usando filter vazio para poder passar o limite
        const limit = 1000;
        
        // Paralelizar as buscas
        const [employees, users] = await Promise.all([
            base44.entities.Employee.filter({}, null, limit),
            base44.entities.User.filter({}, null, limit)
        ]);

        const counts = {};
        const uniqueHolders = new Set(); // Formato: "profileId:uniqueUserIdentifier"

        // Processar Employees
        if (employees && Array.isArray(employees)) {
            employees.forEach(emp => {
                if (emp.profile_id) {
                    // Se o colaborador tem um usuário vinculado, usamos o ID do usuário como identificador único
                    // Caso contrário, usamos o ID do colaborador com prefixo
                    const uniqueId = emp.user_id || `emp_${emp.id}`;
                    uniqueHolders.add(`${emp.profile_id}:${uniqueId}`);
                }
            });
        }

        // Processar Users
        if (users && Array.isArray(users)) {
            users.forEach(u => {
                if (u.profile_id) {
                    // Se este usuário já foi contado através de um colaborador (porque o colaborador tem user_id == u.id),
                    // o Set automaticamente lidará com a duplicidade para o mesmo profile_id.
                    uniqueHolders.add(`${u.profile_id}:${u.id}`);
                }
            });
        }

        // Agregar contagens
        uniqueHolders.forEach(item => {
            const [profileId] = item.split(':');
            counts[profileId] = (counts[profileId] || 0) + 1;
        });

        return Response.json({ 
            counts,
            meta: {
                total_employees: employees?.length || 0,
                total_users: users?.length || 0
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
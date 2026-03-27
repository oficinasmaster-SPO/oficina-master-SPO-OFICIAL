import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar todos os registros com paginação para garantir contagem correta
        const PAGE_SIZE = 500;

        async function fetchAll(entityFn) {
            const results = [];
            let skip = 0;
            while (true) {
                const page = await entityFn(skip, PAGE_SIZE);
                if (!page || page.length === 0) break;
                results.push(...page);
                if (page.length < PAGE_SIZE) break;
                skip += PAGE_SIZE;
            }
            return results;
        }

        const [employees, users] = await Promise.all([
            fetchAll((skip, limit) => base44.asServiceRole.entities.Employee.list(null, limit, skip)),
            fetchAll((skip, limit) => base44.asServiceRole.entities.User.list(null, limit, skip)),
        ]);

        const counts = {};
        const uniqueHolders = new Set();

        if (Array.isArray(employees)) {
            employees.forEach(emp => {
                if (emp.profile_id) {
                    const uniqueId = emp.user_id || `emp_${emp.id}`;
                    uniqueHolders.add(`${emp.profile_id}:${uniqueId}`);
                }
            });
        }

        if (Array.isArray(users)) {
            users.forEach(u => {
                if (u.profile_id) {
                    uniqueHolders.add(`${u.profile_id}:${u.id}`);
                }
            });
        }

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
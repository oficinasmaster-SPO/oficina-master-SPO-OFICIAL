import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        function ensureArray(data) {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (typeof data === 'string') {
                try { return JSON.parse(data); } catch { return []; }
            }
            return [];
        }

        async function fetchAll(entityFn) {
            const results = [];
            let skip = 0;
            const PAGE_SIZE = 50; // Small page size to avoid string truncation
            while (true) {
                const pageRaw = await entityFn(skip, PAGE_SIZE);
                const page = ensureArray(pageRaw);
                if (page.length === 0) break;
                results.push(...page);
                if (page.length < PAGE_SIZE) break;
                skip += PAGE_SIZE;
            }
            return results;
        }

        const [employeesRaw, usersRaw] = await Promise.all([
            fetchAll((skip, limit) => base44.asServiceRole.entities.Employee.list('-created_date', limit, skip)),
            fetchAll((skip, limit) => base44.asServiceRole.entities.User.list('-created_date', limit, skip))
        ]);

        const employees = employeesRaw.filter(emp => emp.email && emp.full_name);
        const users = usersRaw;

        const counts = {};
        const uniqueHolders = new Set();

        employees.forEach(emp => {
            if (emp.profile_id) {
                const uniqueId = emp.user_id || `emp_${emp.id}`;
                uniqueHolders.add(`${emp.profile_id}:${uniqueId}`);
            }
        });

        users.forEach(u => {
            const profileId = u.profile_id || u?.data?.profile_id;
            if (profileId) {
                uniqueHolders.add(`${profileId}:${u.id}`);
            }
        });

        uniqueHolders.forEach(item => {
            const [profileId] = item.split(':');
            counts[profileId] = (counts[profileId] || 0) + 1;
        });

        return Response.json({ 
            counts,
            meta: {
                total_employees: employees.length,
                total_users: users.length
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
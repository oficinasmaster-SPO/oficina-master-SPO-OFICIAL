import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const payload = await req.json();
        const { employee_id, workshop_id, user_id } = payload;

        const emp = await base44.asServiceRole.entities.Employee.get(employee_id);
        const profile = emp.profile_id ? await base44.asServiceRole.entities.UserProfile.get(emp.profile_id) : null;
        const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);

        const roles = profile ? (profile.roles || []) : [];
        const hasPerm = (p) => roles.includes(p);
        const isOwnerOrPartner = ws && (ws.owner_id === user_id || (ws.partner_ids || []).includes(user_id));

        const canAccessPage = (page) => {
            const pagePerms = {
                'GestaoOficina': ['workshop.view', 'workshop.edit'],
                'ResultadoDISC': ['diagnostics.view'],
            };
            const reqs = pagePerms[page];
            if (reqs === true) return true;
            if (!reqs) return false;
            return reqs.some(r => hasPerm(r));
        };

        const results = {
            isOwnerOrPartner: !!isOwnerOrPartner,
            "hasPermission(workshop.view)": hasPerm('workshop.view'),
            "hasPermission(diagnostics.view)": hasPerm('diagnostics.view'),
            "canAccessPage(GestaoOficina)": canAccessPage('GestaoOficina'),
            "canAccessPage(ResultadoDISC)": canAccessPage('ResultadoDISC'),
            debug_info: {
                profile_assigned: !!emp.profile_id,
                profile_name: profile ? profile.name : null,
                roles_count: roles.length
            }
        };

        // Cleanup test data
        await base44.asServiceRole.entities.Employee.delete(employee_id);
        await base44.asServiceRole.entities.Workshop.delete(workshop_id);

        return Response.json(results);

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});
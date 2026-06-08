import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const fakeUserId = `usr_test_${Date.now()}`;
        const email = `test.owner.${Date.now()}@example.com`;

        const ws = await base44.asServiceRole.entities.Workshop.create({
            name: "Oficina Teste Homologacao",
            city: "São Paulo",
            state: "SP",
            owner_id: fakeUserId,
            telefone: "11999999999",
            email: email
        });

        const emp = await base44.asServiceRole.entities.Employee.create({
            workshop_id: ws.id,
            user_id: fakeUserId,
            owner_id: fakeUserId,
            full_name: "Test Owner",
            email: email,
            job_role: "socio",
            position: "Sócio",
            user_type: "external"
        });

        let debugLog = [];

        try {
            await base44.asServiceRole.functions.invoke('createDefaultPermissions', {
                workshop_id: ws.id,
                owner_id: fakeUserId
            });
            debugLog.push("createDefaultPermissions executed successfully");
        } catch(e) {
            debugLog.push("createDefaultPermissions error: " + e.message);
        }

        try {
            await base44.asServiceRole.functions.invoke('autoAssignProfile', {
                employee_id: emp.id,
                job_role: "socio",
                workshop_id: ws.id
            });
            debugLog.push("autoAssignProfile executed successfully");
        } catch(e) {
            debugLog.push("autoAssignProfile error: " + e.message);
            if (e.response && e.response.data) {
                debugLog.push("autoAssignProfile error data: " + JSON.stringify(e.response.data));
            }
        }

        const updatedEmp = await base44.asServiceRole.entities.Employee.get(emp.id);
        const profile = updatedEmp.profile_id ? await base44.asServiceRole.entities.UserProfile.get(updatedEmp.profile_id) : null;

        const confirmation = {
            workshop_created: !!ws.id,
            workshop_id: ws.id,
            owner_id: ws.owner_id,
            employee_created: !!updatedEmp.id,
            employee_id: updatedEmp.id,
            profile_id: updatedEmp.profile_id,
            profile_assigned: !!updatedEmp.profile_id,
            profile_name: profile ? profile.name : null,
        };

        const roles = profile ? (profile.roles || []) : [];
        const hasPerm = (p) => roles.includes(p);
        const isOwnerOrPartner = ws && (ws.owner_id === fakeUserId || (ws.partner_ids || []).includes(fakeUserId));

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

        const debugResults = {
            user_id: fakeUserId,
            isOwnerOrPartner: !!isOwnerOrPartner,
            "hasPermission(workshop.view)": hasPerm('workshop.view'),
            "hasPermission(diagnostics.view)": hasPerm('diagnostics.view'),
            "canAccessPage(GestaoOficina)": canAccessPage('GestaoOficina'),
            "canAccessPage(ResultadoDISC)": canAccessPage('ResultadoDISC')
        };

        await base44.asServiceRole.entities.Employee.delete(updatedEmp.id);
        await base44.asServiceRole.entities.Workshop.delete(ws.id);

        return Response.json({
            real_onboarding_test: confirmation,
            debug_permissions: debugResults,
            logs: debugLog
        });

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});
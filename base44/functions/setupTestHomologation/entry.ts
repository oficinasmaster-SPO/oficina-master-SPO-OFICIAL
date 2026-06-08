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

        return Response.json({
            workshop_id: ws.id,
            owner_id: ws.owner_id,
            employee_id: emp.id,
            user_id: fakeUserId
        });

    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});
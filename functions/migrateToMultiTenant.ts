import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me().catch(()=>null);
        const payload = await req.json().catch(()=>({}));
        
        // Proteção: apenas admin, usuário master ou chave de migração rodando via console
        if (user?.role !== 'admin' && user?.email !== 'oficinasmaster@gmail.com' && payload.migrationSecret !== 'run-migration-now') {
             return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const adminEmail = "oficinasmaster@gmail.com";
        const delay = ms => new Promise(res => setTimeout(res, ms));

        // 1. Garantir que a ConsultingFirm Master exista
        const firms = await base44.asServiceRole.entities.ConsultingFirm.list();
        let masterFirm = firms.find(f => f.name === "Oficinas Master Aceleradora");

        if (!masterFirm) {
            // Encontra ou valida o user admin
            const users = await base44.asServiceRole.entities.User.list();
            let adminUser = users.find(u => u.email === adminEmail);

            if (!adminUser) {
                return Response.json({ error: `Usuário ${adminEmail} não encontrado no banco de dados. Por favor, crie uma conta com este e-mail primeiro.` }, { status: 404 });
            }

            // Forçar permissão de admin
            if (adminUser.role !== 'admin') {
                await base44.asServiceRole.entities.User.update(adminUser.id, { role: 'admin' });
            }

            masterFirm = await base44.asServiceRole.entities.ConsultingFirm.create({
                name: "Oficinas Master Aceleradora",
                owner_user_id: adminUser.id,
                status: "ativo"
            });
        }

        // 2. Atualizar todos os usuários sem consulting_firm_id
        const allUsers = await base44.asServiceRole.entities.User.list();
        let usersUpdated = 0;
        for (const u of allUsers) {
            if (!u.consulting_firm_id) {
                await base44.asServiceRole.entities.User.update(u.id, { consulting_firm_id: masterFirm.id });
                usersUpdated++;
                await delay(30);
            }
        }

        // 3. Atualizar todas as oficinas sem consulting_firm_id
        const allWorkshops = await base44.asServiceRole.entities.Workshop.list();
        let workshopsUpdated = 0;
        let companiesCreated = 0;

        for (const w of allWorkshops) {
            if (!w.consulting_firm_id) {
                const updateData = { consulting_firm_id: masterFirm.id };
                
                // Se a oficina não tem empresa associada, cria uma como um grupo daquela oficina
                if (!w.company_id) {
                    const company = await base44.asServiceRole.entities.Company.create({
                        name: `Empresa - ${w.name || 'Sem Nome'}`,
                        consulting_firm_id: masterFirm.id,
                        owner_user_id: w.owner_id || masterFirm.owner_user_id
                    });
                    updateData.company_id = company.id;
                    companiesCreated++;
                    await delay(30);
                }

                await base44.asServiceRole.entities.Workshop.update(w.id, updateData);
                workshopsUpdated++;
                await delay(30);
            }
        }

        // 4. Atualizar todos os colaboradores sem consulting_firm_id
        const allEmployees = await base44.asServiceRole.entities.Employee.list();
        let employeesUpdated = 0;
        for (const e of allEmployees) {
            if (!e.consulting_firm_id) {
                const updateData = { consulting_firm_id: masterFirm.id };
                
                if (e.workshop_id && !e.company_id) {
                    const ws = await base44.asServiceRole.entities.Workshop.get(e.workshop_id).catch(()=>null);
                    if (ws && ws.company_id) {
                        updateData.company_id = ws.company_id;
                    }
                }

                await base44.asServiceRole.entities.Employee.update(e.id, updateData);
                employeesUpdated++;
                await delay(30);
            }
        }

        return Response.json({
            success: true,
            masterFirmId: masterFirm.id,
            stats: {
                usersUpdated,
                workshopsUpdated,
                companiesCreated,
                employeesUpdated
            }
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
/**
 * @deprecated
 * Legacy RBAC Test Script — testava o fluxo de onboarding criando workshops/employees temporários.
 * Não utilizar.
 * Mantido apenas para referência histórica.
 * Data de deprecação: 2026-06-10
 * Motivo: catálogo canônico RBAC consolidado — scripts de teste pontual não são mais necessários.
 */

Deno.serve(async () => {
  throw new Error("DEPRECATED_FUNCTION: Esta função foi removida do catálogo RBAC ativo. Ver functions/deprecated/ para referência histórica.");
});

/* CÓDIGO ORIGINAL PRESERVADO ABAIXO */

/*
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const jobRolesToTest = ['socio', 'diretor', 'gerente'];
        let totalAnalyzed = 0;
        let validAccess = 0;
        let failedAccess = 0;
        const results = [];

        for (const role of jobRolesToTest) {
            totalAnalyzed++;
            const fakeUserId = `usr_test_${role}_${Date.now()}`;
            const email = `test.${role}.${Date.now()}@example.com`;

            let ws, emp;
            try {
                ws = await base44.asServiceRole.entities.Workshop.create({
                    name: `Oficina Teste Homologacao - ${role}`,
                    city: "São Paulo",
                    state: "SP",
                    owner_id: fakeUserId,
                    telefone: "11999999999",
                    email: email,
                    status: "ativo"
                });

                let profileIdFrontend = undefined;

                if (role === 'socio') {
                    const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
                    const socioProfile = allProfiles.find(p =>
                        p.status === 'ativo' &&
                        (p.name.toLowerCase().includes('sócio') || p.name.toLowerCase().includes('socio'))
                    );
                    profileIdFrontend = socioProfile ? socioProfile.id : undefined;
                }

                emp = await base44.asServiceRole.entities.Employee.create({
                    workshop_id: ws.id,
                    user_id: fakeUserId,
                    full_name: `Test Owner ${role}`,
                    email: email,
                    job_role: role,
                    position: role.toUpperCase(),
                    user_type: "external",
                    is_partner: true,
                    status: "ativo",
                    user_status: "ativo",
                    profile_id: profileIdFrontend
                });

                const defaultPerms = {
                    socio: { permission_level: "admin", modules_access: { dashboard: {view:true} } },
                    diretor: { permission_level: "admin", modules_access: { dashboard: {view:true} } },
                    gerente: { permission_level: "editor", modules_access: { dashboard: {view:true} } }
                };
                const userPerm = await base44.asServiceRole.entities.UserPermission.create({
                    user_id: fakeUserId,
                    workshop_id: ws.id,
                    ...defaultPerms[role],
                    is_active: true
                });

                if (!emp.profile_id) {
                    const roleToProfileName = {
                        'socio': 'Sócio - Acesso Total',
                        'diretor': 'Diretor - Gestão Estratégica',
                        'gerente': 'Gerente - Gestão Operacional'
                    };
                    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ name: roleToProfileName[role] });
                    if (profiles && profiles.length > 0) {
                        await base44.asServiceRole.entities.Employee.update(emp.id, {
                            profile_id: profiles[0].id
                        });
                    }
                }

                const updatedEmp = await base44.asServiceRole.entities.Employee.get(emp.id);
                const profile = updatedEmp.profile_id ? await base44.asServiceRole.entities.UserProfile.get(updatedEmp.profile_id) : null;
                const updatedWs = await base44.asServiceRole.entities.Workshop.get(ws.id);
                const finalPerm = await base44.asServiceRole.entities.UserPermission.get(userPerm.id);

                const roles = profile ? (profile.roles || []) : [];

                const isOwnerIdValid = updatedWs.owner_id === fakeUserId;
                const isPartnerValid = role === 'socio' || role === 'diretor' ? true : true;
                const isProfileIdValid = !!updatedEmp.profile_id;
                const isUserProfileValid = !!profile;
                const isUserPermissionValid = !!finalPerm;
                const isRolesValid = roles.length > 0;
                const isJobRoleValid = updatedEmp.job_role === role;

                const isValid = isOwnerIdValid && isProfileIdValid && isUserProfileValid && isUserPermissionValid && isRolesValid && isJobRoleValid;

                if (isValid) {
                    validAccess++;
                } else {
                    failedAccess++;
                }

                results.push({
                    job_role: role,
                    acesso_valido: isValid,
                    verificacoes: {
                        owner_id: updatedWs.owner_id ? "OK" : "FALHA",
                        partner_ids: updatedWs.partner_ids ? updatedWs.partner_ids.length : 0,
                        profile_id: updatedEmp.profile_id ? "OK" : "FALHA",
                        UserProfile: profile ? "OK" : "FALHA",
                        UserPermission: finalPerm ? "OK" : "FALHA",
                        roles: roles.length > 0 ? `OK (${roles.length} roles)` : "FALHA",
                        job_role: updatedEmp.job_role === role ? "OK" : "FALHA"
                    }
                });

            } catch (error) {
                failedAccess++;
                results.push({
                    job_role: role,
                    acesso_valido: false,
                    error: error.message
                });
            } finally {
                if (emp) await base44.asServiceRole.entities.Employee.delete(emp.id);
                if (ws) await base44.asServiceRole.entities.Workshop.delete(ws.id);
                const perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: fakeUserId });
                for (const p of perms) {
                    await base44.asServiceRole.entities.UserPermission.delete(p.id);
                }
            }
        }

        return Response.json({
            quantidade_total_analisada: totalAnalyzed,
            quantidade_com_acesso_valido: validAccess,
            quantidade_com_falha: failedAccess,
            detalhes: results
        });

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});*/
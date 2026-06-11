import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Validar evento de criação de User
        if (event.type !== 'create' || event.entity_name !== 'User') {
            return Response.json({ error: 'Invalid event' }, { status: 400 });
        }

        const user = data;
        
        if (!user || !user.id || !user.email) {
            return Response.json({ error: 'Invalid user data' }, { status: 400 });
        }

        console.log(`🔄 Processando criação de User: ${user.id} (${user.email})`);

        // Segurança: Verificar se Employee já existe para este usuário
        const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
            user_id: user.id
        });

        if (existingEmployees && existingEmployees.length > 0) {
            console.log(`⚠️ Employee já existe para usuário ${user.id}`);
            return Response.json({ 
                success: false, 
                message: 'Employee já criado para este usuário',
                employee_id: existingEmployees[0].id
            });
        }

        // Buscar EmployeeInvite vinculado ao usuário
        let invite = null;
        let workshopId = null;
        let profileId = null;
        let inviteConsultingFirmId = null;

        if (user.invite_id) {
            try {
                invite = await base44.asServiceRole.entities.EmployeeInvite.get(user.invite_id);
                if (invite) {
                    workshopId = invite.workshop_id;
                    profileId = invite.profile_id;
                    inviteConsultingFirmId = invite.consulting_firm_id || invite.metadata?.consulting_firm_id || null;
                    console.log(`✅ EmployeeInvite encontrado: workshop_id=${workshopId}, profile_id=${profileId}`);
                }
            } catch (e) {
                console.warn(`⚠️ Erro ao buscar EmployeeInvite ${user.invite_id}:`, e.message);
            }
        }

        // Se não tem workshop_id via invite, tentar via profile_id do user
        if (!workshopId && user.profile_id) {
            try {
                const profile = await base44.asServiceRole.entities.UserProfile.get(user.profile_id);
                if (profile && profile.workshop_id) {
                    workshopId = profile.workshop_id;
                    console.log(`✅ workshop_id obtido via UserProfile: ${workshopId}`);
                }
            } catch (e) {
                console.warn(`⚠️ Erro ao buscar UserProfile:`, e.message);
            }
        }

        // Fallback: usar workshop_id direto do user se existir
        if (!workshopId && user.workshop_id) {
            workshopId = user.workshop_id;
            console.log(`✅ workshop_id obtido direto do User: ${workshopId}`);
        }

        // Vincular novo usuário via Sign Up à consultoria padrão (Oficinas Master Aceleradora)
        const defaultConsultingFirmId = '69bab264d7c3fe5d367c3959';
        let updatedConsultingFirmId = null;

        if (!user.consulting_firm_id && !invite) {
            console.log(`✅ Atualizando User ${user.id} com consulting_firm_id padrão: ${defaultConsultingFirmId}`);
            await base44.asServiceRole.entities.User.update(user.id, {
                consulting_firm_id: defaultConsultingFirmId
            });
            updatedConsultingFirmId = defaultConsultingFirmId;
        }

        // Validar workshop_id — se não encontrado, verificar se é signup público
        if (!workshopId) {
            // R3 FIX (Opção A): detectar signup público sem invite.
            // Usuário que acabou de criar conta pode ter Workshop rascunho pendente.
            // Cadastro.jsx cria Workshop ANTES do Employee — se o usuário abandona entre
            // os dois, Workshop existe sem Employee. Aqui criamos o Employee placeholder
            // para garantir que o usuário tenha permissões ao retornar.
            if (!invite) {
                try {
                    const rascunhos = await base44.asServiceRole.entities.Workshop.filter({
                        owner_id: user.id,
                        status: 'rascunho'
                    });
                    if (rascunhos && rascunhos.length > 0) {
                        workshopId = rascunhos[0].id;
                        profileId = profileId || '6a272f8ea3fa8dd02ca7350e'; // Sócio - Acesso Total
                        console.log(`🏗️ [R3] Workshop rascunho encontrado para signup público: ${workshopId}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ [R3] Erro ao buscar workshop rascunho:`, e.message);
                }
            }

            if (!workshopId) {
                console.error(`❌ Nenhum workshop_id encontrado para usuário ${user.id}`);
                return Response.json({ 
                    success: false, 
                    message: 'workshop_id não encontrado - Employee não será criado, mas usuário foi processado',
                    user_id: user.id,
                    consulting_firm_id: updatedConsultingFirmId || user.consulting_firm_id,
                    details: 'Vincule o usuário a um convite ou workshop válido'
                });
            }
        }

        // P5 FIX (2026-06-10): removido user.profile_id como fallback — campo deprecated.
        // User.profile_id não é lido pelo PermissionsContext e pode conter 'workshopId.auto'
        // (string inválida gravada por registerEmployeeComplete em fluxos legados).
        // Fonte canônica: profileId vindo do invite, ou FALLBACK_PROFILE_ID se ausente.
        const FALLBACK_PROFILE_ID = '6a272f876b16129b2f5f31be'; // Técnico - Acesso Operacional
        const employeeProfileId = profileId || FALLBACK_PROFILE_ID;

        const existingEmployeeByEmail = await base44.asServiceRole.entities.Employee.filter({
            email: user.email,
            workshop_id: workshopId
        });

        if (existingEmployeeByEmail && existingEmployeeByEmail.length > 0) {
            const employee = existingEmployeeByEmail[0];
            await base44.asServiceRole.entities.Employee.update(employee.id, {
                user_id: user.id,
                consulting_firm_id: employee.consulting_firm_id || inviteConsultingFirmId || updatedConsultingFirmId || user.consulting_firm_id || defaultConsultingFirmId,
                profile_id: employee.profile_id || employeeProfileId,
                user_status: 'ativo'
            });

            return Response.json({ 
                success: true, 
                message: 'Employee existente vinculado automaticamente ao criar User',
                employee_id: employee.id,
                user_id: user.id,
                workshop_id: workshopId,
                profile_id: employee.profile_id || employeeProfileId || null
            });
        }

        // Criar Employee record
        const employeeData = {
            workshop_id: workshopId,
            consulting_firm_id: inviteConsultingFirmId || updatedConsultingFirmId || user.consulting_firm_id || defaultConsultingFirmId,
            user_id: user.id,
            full_name: user.full_name || user.email.split('@')[0],
            email: user.email,
            position: 'Colaborador',
            job_role: 'outros',
            area: 'administrativo',
            tipo_vinculo: 'cliente',
            status: 'ativo',
            user_status: 'ativo',
            hire_date: new Date().toISOString().split('T')[0]
        };

        // Adicionar profile_id se disponível
        if (employeeProfileId) {
            employeeData.profile_id = employeeProfileId;
            console.log(`📋 profile_id será vinculado: ${employeeProfileId}`);
        }

        const newEmployee = await base44.asServiceRole.entities.Employee.create(employeeData);

        console.log(`✅ Employee criado com sucesso: ${newEmployee.id}`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Workshop ID: ${workshopId}`);
        console.log(`   - Profile ID: ${employeeProfileId || 'N/A'}`);

        return Response.json({ 
            success: true, 
            message: 'Employee criado automaticamente ao criar User',
            employee_id: newEmployee.id,
            user_id: user.id,
            workshop_id: workshopId,
            profile_id: employeeProfileId || null
        });

    } catch (error) {
        console.error('❌ Erro ao criar Employee:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});
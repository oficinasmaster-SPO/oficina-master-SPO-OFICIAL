import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

        // Validar workshop_id obrigatório
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

        // Usar profile_id do user se disponível, caso contrário do invite
        const employeeProfileId = user.profile_id || profileId;

        // Criar Employee record
        const employeeData = {
            workshop_id: workshopId,
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
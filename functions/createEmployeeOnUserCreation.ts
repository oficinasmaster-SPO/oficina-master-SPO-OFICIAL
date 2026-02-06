import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, old_data } = await req.json();

        // Verificar se é evento de criação de EmployeeInviteAcceptance
        if (event.type !== 'create' || event.entity_name !== 'EmployeeInviteAcceptance') {
            return Response.json({ error: 'Invalid event' }, { status: 400 });
        }

        const invitation = data;
        
        if (!invitation || !invitation.user_id || !invitation.workshop_id || !invitation.email) {
            return Response.json({ error: 'Invalid invitation data' }, { status: 400 });
        }

        // Segurança: verificar se já foi processado
        if (invitation.processed) {
            console.log(`Convite ${invitation.id} já foi processado`);
            return Response.json({ success: false, message: 'Convite já processado' });
        }

        // Buscar dados originais do convite para obter job_role, area, etc
        let inviteData = {};
        if (invitation.invite_id) {
            try {
                const originalInvite = await base44.asServiceRole.entities.EmployeeInvite.get(invitation.invite_id);
                if (originalInvite) {
                    inviteData = originalInvite;
                    console.log("📄 Dados do convite original recuperados:", {
                        job_role: inviteData.job_role,
                        position: inviteData.position,
                        area: inviteData.area,
                        profile_id: inviteData.profile_id
                    });
                }
            } catch (e) {
                console.warn("⚠️ Não foi possível buscar o convite original:", e);
            }
        }

        // Verificar se Employee já existe para este usuário
        const existingEmployee = await base44.asServiceRole.entities.Employee.filter({
            user_id: invitation.user_id
        });

        let employee;
        const employeeData = {
            workshop_id: invitation.workshop_id,
            full_name: invitation.full_name || invitation.email.split('@')[0],
            email: invitation.email,
            // Usar dados do convite original ou defaults
            position: inviteData.position || 'Colaborador',
            job_role: inviteData.job_role || 'outros',
            area: inviteData.area || 'administrativo',
            tipo_vinculo: 'cliente',
            status: 'ativo',
            user_status: 'ativo',
            hire_date: new Date().toISOString().split('T')[0]
        };

        // Adicionar profile_id se fornecido (prioridade: convite original > acceptance > null)
        const targetProfileId = inviteData.profile_id || invitation.profile_id;
        if (targetProfileId) {
            employeeData.profile_id = targetProfileId;
        }

        if (existingEmployee && existingEmployee.length > 0) {
            // ATUALIZAR Employee existente
            employee = existingEmployee[0];
            console.log(`Employee já existe (${employee.id}). Atualizando dados...`);

            const updateData = {
                workshop_id: invitation.workshop_id,
                user_status: 'ativo',
                status: 'ativo'
            };

            // Atualizar profile_id se houver um novo
            if (targetProfileId) {
                updateData.profile_id = targetProfileId;
            }

            // Atualizar outros campos apenas se estiverem vazios no employee ou se quisermos forçar (opcional)
            // Aqui vamos manter o existente se já tiver, mas garantir profile e workshop
            
            await base44.asServiceRole.entities.Employee.update(employee.id, updateData);

            console.log(`✅ Employee atualizado: ${employee.id}`);
        } else {
            // Criar novo Employee se não existir
            console.log(`Criando novo Employee para usuário ${invitation.user_id}`);
            employeeData.user_id = invitation.user_id;
            employee = await base44.asServiceRole.entities.Employee.create(employeeData);
            console.log(`✅ Employee criado: ${employee.id}`);
        }

        const newEmployee = employee;

        // 🔄 ATUALIZAR USER ENTITY (Garantir associação de perfil)
        console.log(`🔄 Sincronizando User ${invitation.user_id}...`);
        const userUpdateData = {
            workshop_id: invitation.workshop_id
        };

        if (targetProfileId) {
            userUpdateData.profile_id = targetProfileId;
            
            // Sincronizar Custom Roles do Perfil
            try {
                const profile = await base44.asServiceRole.entities.UserProfile.get(targetProfileId);
                if (profile && profile.custom_role_ids && profile.custom_role_ids.length > 0) {
                    userUpdateData.custom_role_ids = profile.custom_role_ids;
                    
                    // Também atualizar no Employee
                    await base44.asServiceRole.entities.Employee.update(newEmployee.id, {
                        custom_role_ids: profile.custom_role_ids
                    });
                    console.log("✅ Custom roles sincronizadas");
                }
            } catch (e) {
                console.warn("⚠️ Erro ao buscar perfil para custom roles:", e);
            }
        }

        // Forçar atualização do User
        await base44.asServiceRole.entities.User.update(invitation.user_id, userUpdateData);
        console.log(`✅ User atualizado com Profile: ${targetProfileId} e Workshop: ${invitation.workshop_id}`);

        // Marcar convite como processado
        await base44.asServiceRole.entities.EmployeeInviteAcceptance.update(invitation.id, {
            processed: true
        });

        console.log(`Employee criado/atualizado com sucesso: ${newEmployee.id} para usuário ${invitation.user_id}`);

        return Response.json({ 
            success: true, 
            message: 'Employee criado/atualizado e User sincronizado',
            employee_id: newEmployee.id,
            user_id: invitation.user_id,
            workshop_id: invitation.workshop_id,
            profile_id: targetProfileId
        });

    } catch (error) {
        console.error('Erro ao criar Employee:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});
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

        // Verificar se Employee já existe para este usuário
        const existingEmployee = await base44.asServiceRole.entities.Employee.filter({
            user_id: invitation.user_id
        });

        if (existingEmployee && existingEmployee.length > 0) {
            console.log(`Employee já existe para usuário ${invitation.user_id}`);
            return Response.json({ success: false, message: 'Employee já criado' });
        }

        // Criar Employee record com profile_id se fornecido
        const employeeData = {
            workshop_id: invitation.workshop_id,
            user_id: invitation.user_id,
            full_name: invitation.full_name || invitation.email.split('@')[0],
            email: invitation.email,
            position: 'Colaborador',
            job_role: 'outros',
            area: 'administrativo',
            tipo_vinculo: 'cliente',
            status: 'ativo',
            user_status: 'ativo',
            hire_date: new Date().toISOString().split('T')[0]
        };

        // Adicionar profile_id se fornecido na invitação
        if (invitation.profile_id) {
            employeeData.profile_id = invitation.profile_id;
        }

        const newEmployee = await base44.asServiceRole.entities.Employee.create(employeeData);

        // Marcar convite como processado
        await base44.asServiceRole.entities.EmployeeInviteAcceptance.update(invitation.id, {
            processed: true
        });

        console.log(`Employee criado com sucesso: ${newEmployee.id} para usuário ${invitation.user_id}`);

        return Response.json({ 
            success: true, 
            message: 'Employee criado automaticamente',
            employee_id: newEmployee.id,
            user_id: invitation.user_id,
            workshop_id: invitation.workshop_id
        });

    } catch (error) {
        console.error('Erro ao criar Employee:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});
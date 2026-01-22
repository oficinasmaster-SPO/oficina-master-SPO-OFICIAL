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

        let employee;
        const employeeData = {
            workshop_id: invitation.workshop_id,
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

        // Adicionar profile_id se fornecido
        if (invitation.profile_id) {
            employeeData.profile_id = invitation.profile_id;
        }

        if (existingEmployee && existingEmployee.length > 0) {
            // ATUALIZAR Employee existente com workshop_id e profile_id
            employee = existingEmployee[0];
            console.log(`Employee já existe (${employee.id}). Atualizando com workshop_id...`);

            await base44.asServiceRole.entities.Employee.update(employee.id, {
                workshop_id: invitation.workshop_id,
                profile_id: invitation.profile_id || employee.profile_id,
                full_name: invitation.full_name || employee.full_name,
                email: invitation.email || employee.email
            });

            console.log(`✅ Employee atualizado: ${employee.id} com workshop_id: ${invitation.workshop_id}`);
        } else {
            // Criar novo Employee se não existir
            console.log(`Criando novo Employee para usuário ${invitation.user_id}`);
            employeeData.user_id = invitation.user_id;
            employee = await base44.asServiceRole.entities.Employee.create(employeeData);
            console.log(`✅ Employee criado: ${employee.id}`);
        }

        const newEmployee = employee;

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
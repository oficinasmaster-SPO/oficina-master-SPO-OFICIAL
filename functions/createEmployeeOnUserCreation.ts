import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Verificar se é evento de criação de User
        if (event.type !== 'create' || event.entity_name !== 'User') {
            return Response.json({ error: 'Invalid event' }, { status: 400 });
        }

        const user = data;
        
        if (!user || !user.id || !user.email) {
            return Response.json({ error: 'Invalid user data' }, { status: 400 });
        }

        // Verificar se Employee já existe para este usuário
        const existingEmployee = await base44.asServiceRole.entities.Employee.filter({
            user_id: user.id
        });

        if (existingEmployee && existingEmployee.length > 0) {
            console.log(`Employee já existe para usuário ${user.id}`);
            return Response.json({ success: false, message: 'Employee já criado' });
        }

        // Obter workshop_id dos metadados do convite ou usar um padrão
        let workshopId = null;
        
        // Se o usuário tem workshop_id nos dados
        if (user.workshop_id) {
            workshopId = user.workshop_id;
        }

        // Se não houver workshop_id, tentar obter da empresa padrão do usuário
        if (!workshopId) {
            const workshops = await base44.asServiceRole.entities.Workshop.filter({
                owner_id: user.id
            });
            
            if (workshops && workshops.length > 0) {
                workshopId = workshops[0].id;
            }
        }

        // Se ainda não houver workshop_id, usar o primeiro workshop disponível como fallback
        // (apenas para não bloquear o usuário)
        if (!workshopId) {
            const allWorkshops = await base44.asServiceRole.entities.Workshop.list();
            if (allWorkshops && allWorkshops.length > 0) {
                workshopId = allWorkshops[0].id;
            }
        }

        if (!workshopId) {
            console.error(`Nenhum workshop encontrado para usuário ${user.id}`);
            return Response.json({ 
                success: false, 
                message: 'Workshop não encontrado',
                user_id: user.id 
            });
        }

        // Criar Employee record
        const newEmployee = await base44.asServiceRole.entities.Employee.create({
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
        });

        console.log(`Employee criado com sucesso: ${newEmployee.id} para usuário ${user.id}`);

        return Response.json({ 
            success: true, 
            message: 'Employee criado automaticamente',
            employee_id: newEmployee.id,
            user_id: user.id
        });

    } catch (error) {
        console.error('Erro ao criar Employee:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});
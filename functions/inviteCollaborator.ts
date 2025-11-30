import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { workshop_id, full_name, email, workshop_role, is_partner, phone, department } = body;

        // Validar auth
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Verificar se usuário já existe no Auth (mock - base44 não expõe check de user auth diretamente de forma simples sem tentar criar ou buscar por email se tiver permissão)
        // Vamos tentar criar o Employee primeiro. Se o user_id não existir, vamos ter que "criar" um convite pendente ou criar o usuário.
        // Na plataforma Base44, geralmente usamos o sistema de convite de usuário do próprio dashboard ou criamos um registro "EmployeeInvite".
        // Aqui vamos simular o fluxo:
        // A. Verifica se existe User com esse email (via listagem de Users filtrada - requer admin/service role)
        
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
        let userId = null;

        if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
        } else {
            // Se não existe usuário, teríamos que convidá-lo para a plataforma.
            // Como não temos API pública de "Invite User to App" aqui, vamos simular criando apenas o Employee
            // e assumindo que o dono enviará o link de cadastro, ou usamos um "EmployeeInvite" entity.
            // Para este MVP, vamos retornar uma mensagem dizendo que o usuário precisa se cadastrar.
            // MELHORIA: Criar um "EmployeeInvite" que quando o usuário se cadastrar, um hook vincula ele.
        }

        // 2. Criar registro Employee
        // Se o usuário já existe, vinculamos. Se não, deixamos user_id null e esperamos ele entrar (fluxo de convite pendente)
        
        const employeeData = {
            workshop_id,
            full_name,
            email,
            workshop_role,
            is_partner: !!is_partner,
            phone,
            department,
            status: 'ativo',
            user_id: userId // Pode ser null se usuário ainda não existe na plataforma
        };

        // Verifica se já existe employee com este email nesta oficina
        const existingEmployee = await base44.entities.Employee.filter({ 
            workshop_id, 
            email 
        });

        if (existingEmployee.length > 0) {
            return Response.json({ error: 'Colaborador já cadastrado com este e-mail.' }, { status: 400 });
        }

        const newEmployee = await base44.entities.Employee.create(employeeData);

        // 3. Enviar E-mail (Simulado ou via integração SendEmail se disponível)
        // Vamos usar a integração SendEmail
        try {
            await base44.integrations.Core.SendEmail({
                to: email,
                subject: `Convite para acessar Oficinas Master`,
                body: `Olá ${full_name},\n\nVocê foi convidado para fazer parte da equipe na Oficinas Master como ${workshop_role}.\n\nAcesse a plataforma para começar: https://app.base44.com\n\nSe você ainda não tem conta, crie uma utilizando este mesmo e-mail.`
            });
        } catch (mailError) {
            console.error("Erro ao enviar email", mailError);
            // Não falha a request principal, apenas loga
        }

        return Response.json({ success: true, employee: newEmployee });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
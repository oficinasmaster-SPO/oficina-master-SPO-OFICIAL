import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação admin
        const user = await base44.auth.me();
        if (!user || !user.id) {
            return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
        }
        if (user.role !== 'admin') {
            return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado. Apenas admins podem executar esta ação.' } }, { status: 403 });
        }

        let body;
        try {
            body = await req.json();
        } catch(e) {
            return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
        }

        const { email, keep_id } = body;

        if (!email || typeof email !== 'string') {
            return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email é obrigatório e deve ser string' } }, { status: 400 });
        }
        if (keep_id && typeof keep_id !== 'string') {
            return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'keep_id deve ser string' } }, { status: 400 });
        }

        // Buscar todos os registros com o email
        const employees = await base44.entities.Employee.filter({ email });
        const invites = await base44.entities.EmployeeInvite.filter({ email });

        if ((!employees || employees.length === 0) && (!invites || invites.length === 0)) {
            return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Nenhum registro encontrado' } }, { status: 404 });
        }

        async function validateBusinessRules(data, context) {
            const { employees } = data;
            const { base44 } = context;
            for (const emp of employees) {
                if (emp.user_id) {
                    const workshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: emp.user_id });
                    if (workshops && workshops.length > 0) {
                        throw { code: 'BUSINESS_RULE_VIOLATION', message: `Não é possível excluir o email ${emp.email} pois é proprietário de uma oficina.` };
                    }
                }
            }
        }

        try {
            await validateBusinessRules({ employees }, { base44 });
        } catch (ruleError) {
            return Response.json({ success: false, error: ruleError }, { status: 400 });
        }

        const deleted = [];
        
        // Se keep_id foi fornecido, deletar todos exceto o keep_id
        if (keep_id) {
            for (const emp of employees) {
                if (emp.id !== keep_id) {
                    await base44.entities.Employee.delete(emp.id);
                    deleted.push({ type: 'Employee', id: emp.id });
                }
            }
        } else {
            // Se keep_id não foi fornecido, deletar TODOS os registros
            for (const emp of employees) {
                // Deletar user vinculado se existir
                if (emp.user_id) {
                    try {
                        await base44.entities.User.delete(emp.user_id);
                        deleted.push({ type: 'User', id: emp.user_id });
                    } catch (e) {
                        console.error('Erro ao deletar User:', e);
                    }
                }
                await base44.entities.Employee.delete(emp.id);
                deleted.push({ type: 'Employee', id: emp.id });
            }
            
            // Deletar todos os convites
            for (const invite of invites) {
                await base44.entities.EmployeeInvite.delete(invite.id);
                deleted.push({ type: 'EmployeeInvite', id: invite.id });
            }
        }

        return Response.json({
            success: true,
            data: {
                kept_id: keep_id || null,
                deleted_items: deleted,
                message: keep_id 
                    ? `${deleted.length} registro(s) duplicado(s) removido(s)`
                    : `Todos os registros do email ${email} foram removidos (${deleted.length} items)`
            }
        });

    } catch (error) {
        console.error('Erro ao deletar Employee:', error);
        return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Acesso negado. Apenas admins podem executar esta ação.' }, { status: 403 });
        }

        const { email, keep_id } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        // Buscar todos os registros com o email
        const employees = await base44.asServiceRole.entities.Employee.filter({ email });
        const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ email });

        if ((!employees || employees.length === 0) && (!invites || invites.length === 0)) {
            return Response.json({ error: 'Nenhum registro encontrado' }, { status: 404 });
        }

        const deleted = [];
        
        // Se keep_id foi fornecido, deletar todos exceto o keep_id
        if (keep_id) {
            for (const emp of employees) {
                if (emp.id !== keep_id) {
                    await base44.asServiceRole.entities.Employee.delete(emp.id);
                    deleted.push({ type: 'Employee', id: emp.id });
                }
            }
        } else {
            // Se keep_id não foi fornecido, deletar TODOS os registros
            for (const emp of employees) {
                // Deletar user vinculado se existir
                if (emp.user_id) {
                    try {
                        await base44.asServiceRole.users.delete(emp.user_id);
                        deleted.push({ type: 'User', id: emp.user_id });
                    } catch (e) {
                        console.error('Erro ao deletar User:', e);
                    }
                }
                await base44.asServiceRole.entities.Employee.delete(emp.id);
                deleted.push({ type: 'Employee', id: emp.id });
            }
            
            // Deletar todos os convites
            for (const invite of invites) {
                await base44.asServiceRole.entities.EmployeeInvite.delete(invite.id);
                deleted.push({ type: 'EmployeeInvite', id: invite.id });
            }
        }

        return Response.json({
            success: true,
            kept_id: keep_id || null,
            deleted_items: deleted,
            message: keep_id 
                ? `${deleted.length} registro(s) duplicado(s) removido(s)`
                : `Todos os registros do email ${email} foram removidos (${deleted.length} items)`
        });

    } catch (error) {
        console.error('Erro ao deletar Employee:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
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

        if (!email || !keep_id) {
            return Response.json({ error: 'Email e keep_id são obrigatórios' }, { status: 400 });
        }

        // Buscar todos os registros com o email
        const employees = await base44.asServiceRole.entities.Employee.filter({ email });

        if (!employees || employees.length === 0) {
            return Response.json({ error: 'Nenhum registro encontrado' }, { status: 404 });
        }

        // Deletar todos exceto o keep_id
        const deleted = [];
        for (const emp of employees) {
            if (emp.id !== keep_id) {
                await base44.asServiceRole.entities.Employee.delete(emp.id);
                deleted.push(emp.id);
            }
        }

        return Response.json({
            success: true,
            kept_id: keep_id,
            deleted_ids: deleted,
            message: `${deleted.length} registro(s) duplicado(s) removido(s)`
        });

    } catch (error) {
        console.error('Erro ao deletar Employee:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        const { event } = payload;
        
        // Verifica se é um evento de deleção da entidade Workshop
        if (!event || event.type !== 'delete' || event.entity_name !== 'Workshop') {
            return Response.json({ success: true, message: 'Ignorado: Evento não é deleção de Workshop' });
        }

        const workshopId = event.entity_id;
        console.log(`Iniciando exclusão em cascata para Workshop ID: ${workshopId}`);

        // Busca todos os colaboradores vinculados a esta oficina
        const employees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: workshopId });
        console.log(`Encontrados ${employees.length} colaboradores para excluir.`);

        // Exclui cada colaborador
        for (const emp of employees) {
            await base44.asServiceRole.entities.Employee.delete(emp.id);
            console.log(`Colaborador ID: ${emp.id} excluído com sucesso.`);
        }

        return Response.json({ success: true, deleted_count: employees.length });
    } catch (error) {
        console.error('Erro durante a exclusão em cascata:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});
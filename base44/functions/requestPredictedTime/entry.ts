import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId, technicianId, message } = await req.json();

        if (!taskId || !technicianId) {
            return Response.json({ error: 'Missing taskId or technicianId' }, { status: 400 });
        }

        const task = await base44.entities.Task.get(taskId);
        
        await base44.entities.Notification.create({
            user_id: technicianId,
            type: "nova_tarefa", // Reuse existing type or create new
            title: "Solicitação de Previsão QGP",
            message: message || `Por favor, informe a previsão para a O.S. #${task.qgp_data?.os_number || taskId}`,
            is_read: false,
            subtask_id: taskId // Linking to task for easy navigation
        });

        // Optionally update task status or log this request
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
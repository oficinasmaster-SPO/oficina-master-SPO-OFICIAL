import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todas as tarefas não concluídas com data de vencimento
    const allTasks = await base44.asServiceRole.entities.Task.filter({
      status: { $nin: ['concluida', 'cancelada'] }
    }, '-due_date', 500);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let notificationsCreated = 0;
    let tasksMarkedOverdue = 0;

    for (const task of allTasks) {
      if (!task.due_date || !task.assigned_to || task.assigned_to.length === 0) continue;

      const dueDate = new Date(task.due_date);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let notificationType = null;
      let title = null;
      let message = null;

      if (diffDays < 0) {
        // Tarefa atrasada
        const daysOverdue = Math.abs(diffDays);
        notificationType = 'atrasada';
        title = 'Tarefa atrasada';
        message = `A tarefa "${task.title}" está atrasada há ${daysOverdue} dia${daysOverdue !== 1 ? 's' : ''}`;
        
        // Marcar como atrasada na entidade
        if (!task.is_overdue) {
          await base44.asServiceRole.entities.Task.update(task.id, { is_overdue: true });
          tasksMarkedOverdue++;
        }
      } else if (diffDays === 0) {
        // Vence hoje
        notificationType = 'prazo_hoje';
        title = 'Tarefa vence hoje';
        message = `A tarefa "${task.title}" vence hoje!`;
      } else if (diffDays <= 3) {
        // Prazo próximo (1-3 dias)
        notificationType = 'prazo_proximo';
        title = 'Prazo se aproximando';
        message = `A tarefa "${task.title}" vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
      }

      if (!notificationType) continue;

      // Verificar se já existe notificação do mesmo tipo para esta tarefa hoje
      for (const userId of task.assigned_to) {
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: userId,
          type: notificationType,
          is_read: false
        }, '-created_date', 50);

        const alreadyNotified = existing.some(n => 
          n.metadata?.task_id === task.id && 
          n.created_date && 
          n.created_date.split('T')[0] === todayStr
        );

        if (!alreadyNotified) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: userId,
            workshop_id: task.workshop_id,
            type: notificationType,
            title,
            message,
            is_read: false,
            metadata: { task_id: task.id }
          });
          notificationsCreated++;
        }
      }
    }

    return Response.json({
      success: true,
      tasksChecked: allTasks.length,
      notificationsCreated,
      tasksMarkedOverdue,
      checkedAt: now.toISOString()
    });
  } catch (error) {
    console.error('Erro ao checar tarefas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
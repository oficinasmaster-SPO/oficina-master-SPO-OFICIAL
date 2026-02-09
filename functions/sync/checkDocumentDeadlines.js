import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os colaboradores ativos
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      status: 'ativo' 
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    let notificationsCreated = 0;

    for (const employee of employees) {
      if (!employee.user_id) continue;

      // Verificar documentos com validade
      const documents = employee.documents || [];
      
      for (const doc of documents) {
        if (!doc.validade) continue;

        const validadeDate = new Date(doc.validade);
        
        // Documento vence em 7 dias
        if (validadeDate <= sevenDaysFromNow && validadeDate > now) {
          const daysRemaining = Math.ceil((validadeDate - now) / (24 * 60 * 60 * 1000));
          
          // Verificar se já existe notificação recente
          const existingNotif = await base44.asServiceRole.entities.Notification.filter({
            user_id.user_id,
            type: 'document_expiring',
            message: { $regex.name }
          });

          if (existingNotif.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_id.user_id,
              type: 'document_expiring',
              title: '⚠️ Documento Expirando em Breve',
              message: `Seu documento "${doc.name}" vence em ${daysRemaining} dias. Atualize o documento para evitar problemas.`,
              is_read
            });
            notificationsCreated++;
          }
        }
        
        // Documento já venceu
        if (validadeDate < now) {
          const existingNotif = await base44.asServiceRole.entities.Notification.filter({
            user_id.user_id,
            type: 'document_expired',
            message: { $regex.name }
          });

          if (existingNotif.length === 0) {
            await base44.asServiceRole.entities.Notification.create({
              user_id.user_id,
              type: 'document_expired',
              title: '🚨 Documento Vencido',
              message: `Seu documento "${doc.name}" está vencido. Atualize imediatamente!`,
              is_read
            });
            notificationsCreated++;
          }
        }
      }

      // Verificar cursos obrigatórios
      const courseProgress = await base44.asServiceRole.entities.CourseProgress.filter({
        user_id.user_id,
        status: { $in: ['not_started', 'in_progress'] }
      });

      for (const progress of courseProgress) {
        if (!progress.due_date) continue;

        const dueDate = new Date(progress.due_date);
        
        // Curso vence em 7 dias
        if (dueDate <= sevenDaysFromNow && dueDate > now) {
          const daysRemaining = Math.ceil((dueDate - now) / (24 * 60 * 60 * 1000));
          
          const existingNotif = await base44.asServiceRole.entities.Notification.filter({
            user_id.user_id,
            type: 'course_deadline',
            message: { $regex.course_id }
          });

          if (existingNotif.length === 0) {
            const course = await base44.asServiceRole.entities.TrainingCourse.get(progress.course_id);
            
            await base44.asServiceRole.entities.Notification.create({
              user_id.user_id,
              type: 'course_deadline',
              title: '📚 Prazo de Curso se Aproximando',
              message: `O curso "${course.title}" deve ser concluído em ${daysRemaining} dias.`,
              is_read
            });
            notificationsCreated++;
          }
        }
      }
    }

    return Response.json({ 
      success, 
      notificationsCreated,
      message: `${notificationsCreated} notificações criadas` 
    });

  } catch (error) {
    console.error("Erro ao verificar prazos:", error);
    return Response.json({ 
      error.message 
    }, { status: 500 });
  }
});

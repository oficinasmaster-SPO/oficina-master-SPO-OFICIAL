import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_id, approve, feedback } = await req.json();

    if (!request_id) {
      return Response.json({ error: 'request_id obrigatório' }, { status: 400 });
    }

    // Buscar a solicitação
    const request = await base44.asServiceRole.entities.PermissionChangeRequest.get(request_id);
    
    if (!request) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (request.status !== 'pendente') {
      return Response.json({ error: 'Solicitação já foi processada' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newStatus = approve ? 'aprovado' : 'rejeitado';

    // Atualizar a solicitação
    await base44.asServiceRole.entities.PermissionChangeRequest.update(request_id, {
      status: newStatus,
      approved_by: user.email,
      approved_by_name: user.full_name,
      approved_at: now,
      rejection_reason: approve ? null : feedback
    });

    let logDetails = {
      request_id,
      approved: approve,
      feedback
    };

    // Se aprovado, aplicar as mudanças
    if (approve) {
      const employee = await base44.asServiceRole.entities.Employee.get(request.employee_id);
      
      if (!employee) {
        return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
      }

      const updateData = {};
      let changeDescription = '';

      // Aplicar mudanças baseado no tipo
      switch (request.change_type) {
        case 'profile_change':
          updateData.profile_id = request.requested_profile_id;
          changeDescription = `Perfil alterado de "${request.current_profile_name}" para "${request.requested_profile_name}"`;
          
          // Registrar no log RBAC
          await base44.asServiceRole.entities.RBACLog.create({
            action_type: 'profile_updated',
            performed_by: user.email,
            performed_by_name: user.full_name,
            target_type: 'employee',
            target_id: employee.id,
            target_name: employee.full_name,
            changes: {
              before: { profile_id: request.current_profile_id, profile_name: request.current_profile_name },
              after: { profile_id: request.requested_profile_id, profile_name: request.requested_profile_name }
            },
            affected_users_count: 1,
            notes: `Aprovado via solicitação: ${request.justification || 'Sem justificativa'}`
          });
          break;

        case 'custom_roles_add':
        case 'custom_roles_remove':
          updateData.custom_role_ids = request.requested_custom_role_ids || [];
          changeDescription = request.change_type === 'custom_roles_add' 
            ? 'Roles customizadas adicionadas'
            : 'Roles customizadas removidas';
          
          await base44.asServiceRole.entities.RBACLog.create({
            action_type: 'role_updated',
            performed_by: user.email,
            performed_by_name: user.full_name,
            target_type: 'employee',
            target_id: employee.id,
            target_name: employee.full_name,
            changes: {
              before: { custom_role_ids: request.current_custom_role_ids },
              after: { custom_role_ids: request.requested_custom_role_ids }
            },
            affected_users_count: 1,
            notes: `Aprovado via solicitação: ${request.justification || 'Sem justificativa'}`
          });
          break;

        case 'status_change':
          updateData.user_status = request.requested_status;
          changeDescription = `Status alterado de "${request.current_status}" para "${request.requested_status}"`;
          
          await base44.asServiceRole.entities.RBACLog.create({
            action_type: 'user_permission_changed',
            performed_by: user.email,
            performed_by_name: user.full_name,
            target_type: 'employee',
            target_id: employee.id,
            target_name: employee.full_name,
            changes: {
              before: { user_status: request.current_status },
              after: { user_status: request.requested_status }
            },
            affected_users_count: 1,
            notes: `Aprovado via solicitação: ${request.justification || 'Sem justificativa'}`
          });
          break;
      }

      // Adicionar entrada no audit log do Employee
      const auditEntry = {
        changed_by: user.full_name,
        changed_by_email: user.email,
        changed_at: now,
        action: 'permission_approved',
        field_changed: request.change_type,
        old_value: JSON.stringify({
          profile_id: request.current_profile_id,
          status: request.current_status
        }),
        new_value: JSON.stringify(updateData)
      };

      updateData.audit_log = [...(employee.audit_log || []), auditEntry];

      // Aplicar as mudanças
      await base44.asServiceRole.entities.Employee.update(request.employee_id, updateData);

      // Enviar notificação ao solicitante
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: request.requested_by,
          type: 'status_alterado',
          title: 'Solicitação Aprovada',
          message: `Sua solicitação de alteração para ${request.employee_name} foi aprovada: ${changeDescription}`,
          is_read: false
        });
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
      }

      logDetails.changes_applied = updateData;
      logDetails.change_description = changeDescription;
    } else {
      // Se rejeitado, notificar o solicitante
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: request.requested_by,
          type: 'status_alterado',
          title: 'Solicitação Rejeitada',
          message: `Sua solicitação de alteração para ${request.employee_name} foi rejeitada. Motivo: ${feedback}`,
          is_read: false
        });
      } catch (notifError) {
        console.error('Erro ao criar notificação:', notifError);
      }
    }

    return Response.json({
      success: true,
      approved: approve,
      message: approve ? 'Solicitação aprovada e permissões aplicadas' : 'Solicitação rejeitada',
      details: logDetails
    });

  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar solicitação' 
    }, { status: 500 });
  }
});
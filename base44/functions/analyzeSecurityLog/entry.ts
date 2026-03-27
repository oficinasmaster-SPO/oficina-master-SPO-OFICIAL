import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        
        const logData = payload.data;
        if (!logData) return Response.json({ success: true });

        const isSuspicious = logData.event_type === 'suspicious_access';
        const isInvalid = logData.event_type === 'invalid_attempt';
        
        let shouldAlert = false;
        let alertMessage = '';

        if (isSuspicious) {
            const recentAlert = await base44.asServiceRole.entities.Notification.filter({
                type: 'alerta_seguranca',
                created_date: { $gte: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
            });
            if (recentAlert && recentAlert.length > 0) {
                return Response.json({ success: true, reason: 'alert already sent recently' });
            }

            shouldAlert = true;
            alertMessage = `Acesso suspeito detectado! Endpoint: ${logData.endpoint} | IP: ${logData.ip_address} | User: ${logData.user_id || 'N/A'}`;
        } else if (isInvalid) {
            const recentLogs = await base44.asServiceRole.entities.SecurityLog.filter({
                ip_address: logData.ip_address,
                event_type: 'invalid_attempt',
                created_date: { $gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() }
            });
            
            if (recentLogs && recentLogs.length >= 5) {
                shouldAlert = true;
                alertMessage = `Múltiplas tentativas inválidas (${recentLogs.length}) detectadas do IP: ${logData.ip_address} para endpoint: ${logData.endpoint}`;
            }
        }

        if (shouldAlert) {
            const allAdmins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }) || [];
            const admins = allAdmins.slice(0, 3);
            
            const alertPromises = admins.map(admin => {
                return base44.asServiceRole.entities.Notification.create({
                    user_id: admin.id,
                    type: 'alerta_seguranca',
                    title: '⚠️ ALERTA DE SEGURANÇA',
                    message: alertMessage
                });
            });
            
            await Promise.all(alertPromises);
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error in analyzeSecurityLog:', error);
        return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
});
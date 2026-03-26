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
            shouldAlert = true;
            alertMessage = `Acesso suspeito detectado! Endpoint: ${logData.endpoint} | IP: ${logData.ip_address} | User: ${logData.user_id || 'N/A'}`;
        } else if (isInvalid) {
            const recentLogs = await base44.asServiceRole.entities.SecurityLog.filter({
                ip_address: logData.ip_address,
                event_type: 'invalid_attempt'
            });
            
            if (recentLogs && recentLogs.length >= 5) {
                shouldAlert = true;
                alertMessage = `Múltiplas tentativas inválidas (${recentLogs.length}) detectadas do IP: ${logData.ip_address} para endpoint: ${logData.endpoint}`;
            }
        }

        if (shouldAlert) {
            const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
            
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
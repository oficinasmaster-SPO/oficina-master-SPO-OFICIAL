import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        const { user_id, tenant_id, endpoint, ip_address, status, event_type, details } = payload;
        
        const clientIp = ip_address || req.headers.get("x-forwarded-for") || "unknown";

        await base44.asServiceRole.entities.SecurityLog.create({
            user_id: user_id || null,
            tenant_id: tenant_id || null,
            endpoint: endpoint || "unknown",
            ip_address: clientIp,
            status: String(status),
            event_type: event_type || "access",
            details: details ? JSON.stringify(details) : null
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error in logSecurityEvent:', error);
        return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
});
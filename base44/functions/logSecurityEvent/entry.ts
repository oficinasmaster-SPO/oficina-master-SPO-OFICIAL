import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Throttle: deduplica eventos por IP+endpoint+event_type dentro de 5 minutos
const recentEvents = new Map();
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos
const CLEANUP_INTERVAL = 10 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [key, ts] of recentEvents.entries()) {
        if (now - ts > THROTTLE_MS) recentEvents.delete(key);
    }
}, CLEANUP_INTERVAL);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        const { user_id, tenant_id, endpoint, ip_address, status, event_type, details } = payload;
        
        const clientIp = ip_address || req.headers.get("x-forwarded-for") || "unknown";

        // Throttle: ignorar eventos duplicados (mesmo IP + endpoint + tipo) dentro de 5 min
        const dedupeKey = `${clientIp}:${endpoint || 'unknown'}:${event_type || 'access'}`;
        if (recentEvents.has(dedupeKey)) {
            return Response.json({ success: true, throttled: true });
        }
        recentEvents.set(dedupeKey, Date.now());

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
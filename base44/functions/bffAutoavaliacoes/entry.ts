import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// --- Middlewares ---
const withAuthAndTenant = (handler) => async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            base44.asServiceRole.entities.SecurityLog.create({
                endpoint: new URL(req.url).pathname,
                ip_address: req.headers.get("x-forwarded-for") || "unknown",
                status: "401",
                event_type: "invalid_attempt",
                details: JSON.stringify({ error: "Missing or invalid token" })
            }).catch(e => console.error("Security log error", e));
            return Response.json({ error: 'Unauthorized: Autenticação obrigatória.' }, { status: 401 });
        }

        let tenantId = req.headers.get("x-tenant-id");
        
        // Fallback temporário para payload
        if (!tenantId && req.body) {
            try {
                const clonedReq = req.clone();
                const body = await clonedReq.json();
                tenantId = body.tenantId || body.workshop_id;
            } catch (e) {}
        }

        if (!tenantId) {
            base44.asServiceRole.entities.SecurityLog.create({
                user_id: user.id,
                endpoint: new URL(req.url).pathname,
                ip_address: req.headers.get("x-forwarded-for") || "unknown",
                status: "400",
                event_type: "suspicious_access",
                details: JSON.stringify({ error: "Missing x-tenant-id" })
            }).catch(e => console.error("Security log error", e));

            return Response.json({ error: 'Bad Request: x-tenant-id header é obrigatório para isolamento de dados.' }, { status: 400 });
        }

        base44.asServiceRole.entities.SecurityLog.create({
            user_id: user.id,
            tenant_id: tenantId,
            endpoint: new URL(req.url).pathname,
            ip_address: req.headers.get("x-forwarded-for") || "unknown",
            status: "200",
            event_type: "access"
        }).catch(e => console.error("Security log error", e));

        return await handler(req, { base44, user, tenantId });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

// --- Repositories ---
class AutoavaliacoesRepository {
    constructor(base44) {
        this.base44 = base44;
    }

    async getProcessAssessments(tenantId) {
        return await this.base44.entities.ProcessAssessment.filter({ workshop_id: tenantId });
    }

    async getDiagnostics(tenantId) {
        return await this.base44.entities.Diagnostic.filter({ workshop_id: tenantId });
    }

    async getEntrepreneurDiagnostics(tenantId) {
        return await this.base44.entities.EntrepreneurDiagnostic.filter({ workshop_id: tenantId });
    }

    async getDiscDiagnostics(tenantId) {
        return await this.base44.entities.DISCDiagnostic.filter({ workshop_id: tenantId });
    }
}

// --- Services ---
class AutoavaliacoesService {
    constructor(repository) {
        this.repository = repository;
    }

    async getAutoavaliacoesData(tenantId) {
        const [
            processAssessments,
            diagnostics,
            entrepreneurDiagnostics,
            discDiagnostics
        ] = await Promise.all([
            this.repository.getProcessAssessments(tenantId),
            this.repository.getDiagnostics(tenantId),
            this.repository.getEntrepreneurDiagnostics(tenantId),
            this.repository.getDiscDiagnostics(tenantId)
        ]);

        return {
            processAssessments: processAssessments || [],
            diagnostics: diagnostics || [],
            entrepreneurDiagnostics: entrepreneurDiagnostics || [],
            discDiagnostics: discDiagnostics || []
        };
    }
}

// --- BFF (Controller/Handler) ---
const handleAutoavaliacoes = async (req, { base44, user, tenantId }) => {
    try {
        const repository = new AutoavaliacoesRepository(base44);
        const service = new AutoavaliacoesService(repository);
        const result = await service.getAutoavaliacoesData(tenantId);

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=5'
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
};

Deno.serve(withAuthAndTenant(handleAutoavaliacoes));
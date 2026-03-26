import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// --- Middlewares ---
const withAuthAndTenant = (handler) => async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.id) {
            base44.asServiceRole.entities.SecurityLog.create({
                endpoint: new URL(req.url).pathname,
                ip_address: req.headers.get("x-forwarded-for") || "unknown",
                status: "401",
                event_type: "invalid_attempt",
                details: JSON.stringify({ error: "Missing or invalid token" })
            }).catch(e => console.error("Security log error", e));
            return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação obrigatória.' } }, { status: 401 });
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

        if (!tenantId || typeof tenantId !== 'string') {
            // Log missing tenant access as suspicious
            base44.asServiceRole.entities.SecurityLog.create({
                user_id: user.id,
                endpoint: new URL(req.url).pathname,
                ip_address: req.headers.get("x-forwarded-for") || "unknown",
                status: "400",
                event_type: "suspicious_access",
                details: JSON.stringify({ error: "Missing x-tenant-id" })
            }).catch(e => console.error("Security log error", e));

            return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'x-tenant-id header é obrigatório para isolamento de dados.' } }, { status: 400 });
        }

        // Ownership Enforcement: admin can view all, others can only view their own
        if (user.role !== 'admin' && user.data?.workshop_id !== tenantId) {
             return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
        }

        // Log successful access
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
        return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
};

// --- Repositories ---
class DashboardRepository {
    constructor(base44) {
        this.base44 = base44;
    }

    async getWorkshops() {
        return await this.base44.entities.Workshop.list();
    }
    
    async getOsAssessments() {
        return await this.base44.entities.ServiceOrderDiagnostic.list('-created_date');
    }
    
    async getWorkshopGameProfiles() {
        return await this.base44.entities.WorkshopGameProfile.list();
    }
    
    async getUserGameProfiles() {
        return await this.base44.entities.UserGameProfile.list();
    }
    
    async getEmployees() {
        return await this.base44.entities.Employee.list();
    }
    
    async getAreaGoals() {
        return await this.base44.entities.AreaGoal.list();
    }
    
    async getUsers() {
        return await this.base44.entities.User.list();
    }
    
    async getUserProgress() {
        return await this.base44.entities.UserProgress.list();
    }
}

// --- Services ---
class DashboardService {
    constructor(repository) {
        this.repository = repository;
    }

    async getDashboardData() {
        const [
            workshops,
            osAssessments,
            gameProfiles,
            userGameProfiles,
            employees,
            areaGoals,
            allUsers,
            userProgress
        ] = await Promise.all([
            this.repository.getWorkshops(),
            this.repository.getOsAssessments(),
            this.repository.getWorkshopGameProfiles(),
            this.repository.getUserGameProfiles(),
            this.repository.getEmployees(),
            this.repository.getAreaGoals(),
            this.repository.getUsers(),
            this.repository.getUserProgress()
        ]);

        return {
            workshops: Array.isArray(workshops) ? workshops : [],
            osAssessments: Array.isArray(osAssessments) ? osAssessments : [],
            gameProfiles: Array.isArray(gameProfiles) ? gameProfiles : [],
            userGameProfiles: Array.isArray(userGameProfiles) ? userGameProfiles : [],
            employees: Array.isArray(employees) ? employees : [],
            areaGoals: Array.isArray(areaGoals) ? areaGoals : [],
            allUsers: Array.isArray(allUsers) ? allUsers : [],
            userProgress: Array.isArray(userProgress) ? userProgress : []
        };
    }
}

// --- BFF (Controller/Handler) ---
const handleDashboard = async (req, { base44, user, tenantId }) => {
    try {
        const repository = new DashboardRepository(base44);
        const service = new DashboardService(repository);
        const result = await service.getDashboardData();

        return new Response(JSON.stringify({ success: true, data: result }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=5'
            }
        });
    } catch (error) {
        return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
};

Deno.serve(withAuthAndTenant(handleDashboard));
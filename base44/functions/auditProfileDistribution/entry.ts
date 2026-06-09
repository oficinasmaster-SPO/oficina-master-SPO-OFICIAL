import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // ETAPA 1: Listar todos os employees
        const employees = await base44.entities.Employee.filter({});
        
        if (!employees || employees.length === 0) {
            return Response.json({
                ready_for_phase_4: false,
                employees_safe_percentage: 0,
                critical_job_roles: [],
                warning_job_roles: [],
                message: 'Nenhum colaborador encontrado'
            });
        }

        // ETAPA 2: Resolver profile_id → profile_name
        const profiles = await base44.entities.UserProfile.list();
        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p.id, p.name);
        });

        // ETAPA 3: Agrupar por job_role e calcular percentuais
        const jobRoleData = new Map();
        
        employees.forEach(emp => {
            const jobRole = emp.job_role || 'outros';
            const profileName = profileMap.get(emp.profile_id) || 'Desconhecido';
            
            if (!jobRoleData.has(jobRole)) {
                jobRoleData.set(jobRole, new Map());
            }
            
            const profileCount = jobRoleData.get(jobRole);
            profileCount.set(profileName, (profileCount.get(profileName) || 0) + 1);
        });

        // ETAPA 4: Classificar cada job_role
        const jobRolesAnalysis = [];
        let employeesSafe = 0;
        let employeesWarning = 0;
        let employeesCritical = 0;
        const criticalJobRoles = [];
        const warningJobRoles = [];

        for (const [jobRole, profileCount] of jobRoleData.entries()) {
            const total = Array.from(profileCount.values()).reduce((sum, count) => sum + count, 0);
            const profiles = Array.from(profileCount.entries()).map(([name, count]) => ({
                profile_name: name,
                count,
                percentage: (count / total) * 100
            }));

            const topProfile = profiles.reduce((max, p) => p.percentage > max.percentage ? p : max, profiles[0]);
            const numDifferentProfiles = profiles.length;

            // Classificação rigorosa
            let classification;
            if (topProfile.percentage >= 95) {
                classification = 'SAFE';
                employeesSafe += total;
            } else if (topProfile.percentage >= 80 && topProfile.percentage < 95) {
                classification = 'WARNING';
                employeesWarning += total;
                warningJobRoles.push(jobRole);
            } else {
                classification = 'CRITICAL';
                employeesCritical += total;
                criticalJobRoles.push(jobRole);
            }

            jobRolesAnalysis.push({
                job_role: jobRole,
                total_employees: total,
                profiles,
                num_different_profiles: numDifferentProfiles,
                top_profile: topProfile.profile_name,
                top_profile_percentage: topProfile.percentage,
                classification,
                reasoning: classification === 'SAFE' 
                    ? `${topProfile.percentage.toFixed(1)}% usam "${topProfile.profile_name}" (≥95%)`
                    : classification === 'WARNING'
                    ? `${topProfile.percentage.toFixed(1)}% usam "${topProfile.profile_name}" (80-94%) - ${numDifferentProfiles} perfis`
                    : `${topProfile.percentage.toFixed(1)}% usam "${topProfile.profile_name}" (<80%) - ${numDifferentProfiles} perfis`
            });
        }

        // ETAPA 5: Calcular percentuais ponderados
        const totalEmployees = employeesSafe + employeesWarning + employeesCritical;
        const employeesSafePercentage = totalEmployees > 0 ? (employeesSafe / totalEmployees) * 100 : 0;
        const employeesWarningPercentage = totalEmployees > 0 ? (employeesWarning / totalEmployees) * 100 : 0;
        const employeesCriticalPercentage = totalEmployees > 0 ? (employeesCritical / totalEmployees) * 100 : 0;

        // ETAPA 6: Decisão final
        const readyForPhase4 = criticalJobRoles.length === 0 && warningJobRoles.length === 0;

        return Response.json({
            ready_for_phase_4: readyForPhase4,
            employees_safe_percentage: parseFloat(employeesSafePercentage.toFixed(1)),
            employees_warning_percentage: parseFloat(employeesWarningPercentage.toFixed(1)),
            employees_critical_percentage: parseFloat(employeesCriticalPercentage.toFixed(1)),
            total_employees: totalEmployees,
            employees_safe: employeesSafe,
            employees_warning: employeesWarning,
            employees_critical: employeesCritical,
            critical_job_roles: criticalJobRoles,
            warning_job_roles: warningJobRoles,
            safe_job_roles_count: jobRolesAnalysis.filter(j => j.classification === 'SAFE').length,
            total_job_roles: jobRolesAnalysis.length,
            job_roles: jobRolesAnalysis.sort((a, b) => {
                const order = { CRITICAL: 0, WARNING: 1, SAFE: 2 };
                return order[a.classification] - order[b.classification] || b.total_employees - a.total_employees;
            })
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
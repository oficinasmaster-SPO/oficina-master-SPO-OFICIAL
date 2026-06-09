import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // ETAPA 1: Listar todos os employees e agrupar por job_role
        const employees = await base44.entities.Employee.filter({});
        const allProfiles = await base44.entities.UserProfile.list();
        
        // Mapa de profiles
        const profileMap = new Map();
        allProfiles.forEach(p => {
            profileMap.set(p.id, p.name);
        });

        // Agrupar por job_role
        const jobRoleGroups = new Map();
        employees.forEach(emp => {
            const jobRole = emp.job_role || 'outros';
            if (!jobRoleGroups.has(jobRole)) {
                jobRoleGroups.set(jobRole, []);
            }
            jobRoleGroups.get(jobRole).push(emp);
        });

        // ETAPA 1: Job roles existentes
        const jobRolesExisting = Array.from(jobRoleGroups.entries())
            .map(([job_role, employees]) => ({
                job_role,
                employees_count: employees.length
            }))
            .sort((a, b) => b.employees_count - a.employees_count);

        // ETAPA 2: Perfis utilizados por job_role
        const profilesByJobRole = [];
        jobRoleGroups.forEach((employees, job_role) => {
            const profileCount = new Map();
            employees.forEach(emp => {
                const profileName = profileMap.get(emp.profile_id) || 'Desconhecido';
                profileCount.set(profileName, (profileCount.get(profileName) || 0) + 1);
            });

            const total = employees.length;
            profileCount.forEach((count, profile_name) => {
                profilesByJobRole.push({
                    job_role,
                    profile_name,
                    employees_count: count,
                    percentage: parseFloat(((count / total) * 100).toFixed(1))
                });
            });
        });

        // ETAPA 3: Job roles com múltiplos perfis
        const multipleProfiles = [];
        jobRoleGroups.forEach((employees, job_role) => {
            const profileCount = new Map();
            employees.forEach(emp => {
                const profileName = profileMap.get(emp.profile_id) || 'Desconhecido';
                profileCount.set(profileName, (profileCount.get(profileName) || 0) + 1);
            });

            if (profileCount.size > 1) {
                const profiles = Array.from(profileCount.entries())
                    .map(([profile_name, count]) => ({
                        profile_name,
                        employees_count: count
                    }))
                    .sort((a, b) => b.employees_count - a.employees_count);

                multipleProfiles.push({
                    job_role,
                    profiles_found: profiles
                });
            }
        });

        // ETAPA 4: Matriz de consistência
        const consistencyMatrix = [];
        jobRoleGroups.forEach((employees, job_role) => {
            const profileCount = new Map();
            employees.forEach(emp => {
                const profileName = profileMap.get(emp.profile_id) || 'Desconhecido';
                profileCount.set(profileName, (profileCount.get(profileName) || 0) + 1);
            });

            const total = employees.length;
            const topProfile = Array.from(profileCount.entries())
                .reduce((max, [name, count]) => count > max.count ? {name, count} : max, {name: '', count: 0});
            
            const consistencyPercentage = parseFloat(((topProfile.count / total) * 100).toFixed(1));
            
            let status;
            if (consistencyPercentage >= 95) {
                status = 'SAFE';
            } else if (consistencyPercentage >= 80) {
                status = 'WARNING';
            } else {
                status = 'CRITICAL';
            }

            consistencyMatrix.push({
                job_role,
                status,
                dominant_profile: topProfile.name,
                consistency_percentage: consistencyPercentage,
                total_employees: total
            });
        });

        // ETAPA 5: Detecção de anomalias
        const anomalies = {
            employees_without_profile: [],
            employees_with_invalid_profile: [],
            employees_without_job_role: [],
            profiles_without_employees: [],
            job_roles_without_dominant_profile: []
        };

        // Employees sem profile_id
        employees.forEach(emp => {
            if (!emp.profile_id) {
                anomalies.employees_without_profile.push({
                    id: emp.id,
                    full_name: emp.full_name,
                    email: emp.email,
                    job_role: emp.job_role
                });
            } else if (!profileMap.has(emp.profile_id)) {
                anomalies.employees_with_invalid_profile.push({
                    id: emp.id,
                    full_name: emp.full_name,
                    email: emp.email,
                    profile_id: emp.profile_id
                });
            }

            if (!emp.job_role || emp.job_role.trim() === '') {
                anomalies.employees_without_job_role.push({
                    id: emp.id,
                    full_name: emp.full_name,
                    email: emp.email
                });
            }
        });

        // Profiles sem employees
        const usedProfileIds = new Set(employees.filter(e => e.profile_id).map(e => e.profile_id));
        allProfiles.forEach(profile => {
            if (!usedProfileIds.has(profile.id) && profile.status === 'ativo') {
                anomalies.profiles_without_employees.push({
                    profile_id: profile.id,
                    profile_name: profile.name,
                    type: profile.type
                });
            }
        });

        // Job roles sem perfil dominante (<50%)
        consistencyMatrix.forEach(item => {
            if (item.consistency_percentage < 50) {
                anomalies.job_roles_without_dominant_profile.push({
                    job_role: item.job_role,
                    dominant_profile: item.dominant_profile,
                    consistency_percentage: item.consistency_percentage
                });
            }
        });

        // ETAPA 6: Decisão para Fase 4
        const safeJobRoles = consistencyMatrix.filter(item => item.status === 'SAFE').map(item => item.job_role);
        const warningJobRoles = consistencyMatrix.filter(item => item.status === 'WARNING').map(item => item.job_role);
        const criticalJobRoles = consistencyMatrix.filter(item => item.status === 'CRITICAL').map(item => item.job_role);

        const totalJobRoles = consistencyMatrix.length;
        const safePercentage = totalJobRoles > 0 ? ((safeJobRoles.length / totalJobRoles) * 100).toFixed(1) : 0;
        
        // Critério: Pronto se não houver críticos e >= 90% forem SAFE
        const readyForPhase4 = criticalJobRoles.length === 0 && parseFloat(safePercentage) >= 90;

        const shouldExcludeFromAutoAssign = criticalJobRoles.length > 0 
            ? criticalJobRoles 
            : warningJobRoles.filter(job_role => {
                const item = consistencyMatrix.find(i => i.job_role === job_role);
                return item && item.consistency_percentage < 85;
            });

        return Response.json({
            etapa_1_job_roles_existentes: jobRolesExisting,
            etapa_2_perfis_utilizados: profilesByJobRole,
            etapa_3_multiplos_perfis: multipleProfiles,
            etapa_4_matriz_consistencia: consistencyMatrix,
            etapa_5_anomalias: anomalies,
            etapa_6_decisao: {
                ready_for_phase_4: readyForPhase4,
                safe_job_roles: safeJobRoles,
                warning_job_roles: warningJobRoles,
                critical_job_roles: criticalJobRoles,
                total_job_roles: totalJobRoles,
                safe_percentage: parseFloat(safePercentage),
                recommendation: readyForPhase4 
                    ? 'Sistema pronto para AUTOASSIGN MODE = PRESELECT'
                    : 'Necessário ajustar mapeamento antes de ativar pré-seleção',
                exclude_from_autoassign: shouldExcludeFromAutoAssign
            },
            summary: {
                total_employees: employees.length,
                total_profiles: allProfiles.length,
                job_roles_with_multiple_profiles: multipleProfiles.length,
                anomalies_count: {
                    employees_without_profile: anomalies.employees_without_profile.length,
                    employees_with_invalid_profile: anomalies.employees_with_invalid_profile.length,
                    employees_without_job_role: anomalies.employees_without_job_role.length,
                    profiles_without_employees: anomalies.profiles_without_employees.length,
                    job_roles_without_dominant_profile: anomalies.job_roles_without_dominant_profile.length
                }
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
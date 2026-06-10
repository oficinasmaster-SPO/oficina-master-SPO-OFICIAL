import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// AUDITORIA DEFINITIVA USER ↔ EMPLOYEE (READ-ONLY)
// Critério único: Employee.user_id == User.id (sem email, nome ou telefone)
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const fetchAll = async (entity) => {
            const all = [];
            let skip = 0;
            const limit = 500;
            while (true) {
                const batch = await base44.asServiceRole.entities[entity].list('-created_date', limit, skip);
                all.push(...batch);
                if (batch.length < limit) break;
                skip += limit;
            }
            return all;
        };

        // ETAPA 1 + 2: buscar Users e Employees
        const [allUsers, allEmployees] = await Promise.all([
            fetchAll('User'),
            fetchAll('Employee')
        ]);

        const employeesComUserId = allEmployees.filter(e => e.user_id && String(e.user_id).trim() !== '');
        const employeesSemUserId = allEmployees.filter(e => !e.user_id || String(e.user_id).trim() === '');

        const userIdSet = new Set(allUsers.map(u => u.id));

        // ETAPA 4: Users sem Employee (via user_id apenas)
        const linkedUserIds = new Set(employeesComUserId.map(e => e.user_id));
        const usersSemEmployee = allUsers.filter(u => !linkedUserIds.has(u.id));

        // ETAPA 5: Employees órfãos (user_id preenchido mas User inexistente)
        const employeesOrfaos = employeesComUserId.filter(e => !userIdSet.has(e.user_id));

        // ETAPA 6: Duplicidades — user_id repetido em Employee
        const countByUserId = {};
        for (const e of employeesComUserId) {
            countByUserId[e.user_id] = (countByUserId[e.user_id] || 0) + 1;
        }
        const userIdsDuplicados = Object.entries(countByUserId)
            .filter(([, count]) => count > 1)
            .map(([userId, count]) => ({
                user_id: userId,
                user_exists: userIdSet.has(userId),
                employees_count: count,
                employees: employeesComUserId
                    .filter(e => e.user_id === userId)
                    .map(e => ({
                        employee_id: e.id,
                        full_name: e.full_name,
                        position: e.position,
                        status: e.status,
                        user_status: e.user_status,
                        workshop_id: e.workshop_id,
                        created_date: e.created_date
                    }))
            }));

        // PERGUNTA 4: Employees vinculáveis por email mas SEM user_id
        // (apenas contagem informativa — email NÃO é usado como critério de vínculo)
        const emailToUserId = new Map();
        for (const u of allUsers) {
            if (u.email) emailToUserId.set(String(u.email).toLowerCase(), u.id);
        }
        const employeesVinculadosApenasPorEmail = employeesSemUserId.filter(e =>
            e.email && emailToUserId.has(String(e.email).toLowerCase())
        );

        // ETAPA 8: Classificação
        const issues = [];
        if (employeesOrfaos.length > 0) {
            issues.push({
                severity: 'CRITICAL',
                issue: 'Employees órfãos: user_id aponta para User inexistente',
                count: employeesOrfaos.length
            });
        }
        if (userIdsDuplicados.length > 0) {
            issues.push({
                severity: 'CRITICAL',
                issue: 'User.id vinculado a mais de 1 Employee (quebra relação 1-1)',
                count: userIdsDuplicados.length
            });
        }
        if (employeesVinculadosApenasPorEmail.length > 0) {
            issues.push({
                severity: 'WARNING',
                issue: 'Employees sem user_id mas com email correspondente a um User (dependem de fallback por email)',
                count: employeesVinculadosApenasPorEmail.length
            });
        }
        if (usersSemEmployee.length > 0) {
            issues.push({
                severity: 'WARNING',
                issue: 'Users sem nenhum Employee vinculado por user_id',
                count: usersSemEmployee.length
            });
        }

        const hasCritical = issues.some(i => i.severity === 'CRITICAL');
        const hasWarning = issues.some(i => i.severity === 'WARNING');
        const classificacao_geral = hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'SAFE';

        const canonico_seguro = employeesOrfaos.length === 0 && userIdsDuplicados.length === 0;

        return Response.json({
            // ETAPA 3
            resumo: {
                total_users: allUsers.length,
                total_employees: allEmployees.length,
                employees_com_user_id: employeesComUserId.length,
                employees_sem_user_id: employeesSemUserId.length
            },
            // ETAPA 7
            respostas: {
                "1_users_sem_employee": usersSemEmployee.length,
                "2_employees_sem_user": employeesOrfaos.length,
                "3_user_ids_duplicados_em_employee": userIdsDuplicados.length,
                "4_employees_vinculados_por_email_sem_user_id": employeesVinculadosApenasPorEmail.length,
                "5_user_id_pode_ser_canonico": canonico_seguro
                    ? "SIM — sem órfãos nem duplicidades; user_id é íntegro como chave canônica (pendente apenas migração dos vínculos por email)"
                    : "NÃO — existem órfãos e/ou duplicidades que precisam ser corrigidos antes"
            },
            // ETAPA 4 — detalhes
            users_sem_employee: usersSemEmployee.map(u => ({
                user_id: u.id,
                full_name: u.full_name,
                email: u.email,
                role: u.role,
                created_date: u.created_date
            })),
            // ETAPA 5 — detalhes
            employees_orfaos: employeesOrfaos.map(e => ({
                employee_id: e.id,
                user_id_invalido: e.user_id,
                full_name: e.full_name,
                position: e.position,
                status: e.status,
                workshop_id: e.workshop_id
            })),
            // ETAPA 6 — detalhes
            duplicidades: userIdsDuplicados,
            // PERGUNTA 4 — detalhes
            employees_apenas_email: employeesVinculadosApenasPorEmail.map(e => ({
                employee_id: e.id,
                full_name: e.full_name,
                email: e.email,
                matching_user_id: emailToUserId.get(String(e.email).toLowerCase()),
                workshop_id: e.workshop_id
            })),
            // ETAPA 8
            classificacao: {
                geral: classificacao_geral,
                issues
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
-- ============================================================================
-- VERIFICAÇÃO: Tabelas planejadas (blocos 01-09) vs existentes no PostgreSQL
-- Execute no pgAdmin (Query Tool)
-- ============================================================================

-- Tabelas planejadas nos blocos 01-09 do schema normalizado
WITH planejadas AS (
    SELECT unnest(ARRAY[
        -- ==========================================
        -- BLOCO 01 — Core / Multi-tenant (~10)
        -- ==========================================
        'consulting_firms',
        'companies',
        'workshops',
        'branches',
        'system_settings',
        'tenant_memberships',

        -- ==========================================
        -- BLOCO 02 — Auth / RBAC / Permissões (~6)
        -- ==========================================
        'users',
        'user_profiles',
        'user_sessions',
        'roles',
        'user_permissions',
        'permission_change_requests',
        'profile_templates',

        -- ==========================================
        -- BLOCO 03 — RH / Pessoas (~12)
        -- ==========================================
        'employees',
        'positions',
        'employee_goals',
        'employee_kpis',
        'employee_feedbacks',
        'employee_warnings',
        'employee_invites',
        'hiring_goals',
        'job_descriptions',
        'interview_forms',
        'commission_rules',
        'culture_scripts',

        -- ==========================================
        -- BLOCO 04 — Recrutamento (~6)
        -- ==========================================
        'candidates',
        'candidate_interviews',

        -- ==========================================
        -- BLOCO 05 — Financeiro (~10)
        -- ==========================================
        'accounts_payable',
        'accounts_receivable',
        'bank_accounts',
        'cash_entries',
        'budget_groups',
        'budget_targets',
        'budget_target_history',
        'dre_categories',
        'dre_entries',
        'financial_settlements',

        -- ==========================================
        -- BLOCO 06 — Processos e Gestão (~8)
        -- ==========================================
        'checklist_templates',
        'checklist_template_items',
        'missions',
        'implementation_tracking',
        'implementation_tracking_deps',
        'implementation_tracking_history',

        -- ==========================================
        -- BLOCO 07 — Consultoria / Aceleração (~24)
        -- ==========================================
        'consulting_service_types',
        'consulting_appointments',
        'consulting_appointment_meta',
        'consulting_next_steps',
        'consulting_scheduling_rules',
        'consulting_scheduling_rule_items',
        'consulting_track_templates',
        'consulting_track_missions',
        'consulting_sprints',
        'consulting_sprint_phases',
        'consulting_sprint_tasks',
        'consulting_sprint_review_history',
        'sprint_templates',
        'sprint_template_tasks',
        'contracts',
        'contract_meta',
        'contract_timeline',

        -- ==========================================
        -- BLOCO 08 — Clientes e Inteligência Comercial (15)
        -- ==========================================
        'clients',
        'client_groups',
        'client_group_members',
        'client_indicators',
        'client_intelligence',
        'intelligence_checklists',
        'intelligence_checklist_items',
        'intelligence_checklist_progress',
        'intelligence_checklist_progress_items',
        'sales_records',
        'workshop_game_profiles',
        'workshop_badges',
        'workshop_milestones',
        'workshop_automations',
        'workshop_automation_recipients',

        -- ==========================================
        -- BLOCO 09 — Diagnósticos (28)
        -- ==========================================
        'diagnostics',
        'diagnostic_answers',
        'diagnostic_action_plans',
        'diagnostic_action_plan_meta',
        'diagnostic_invites',
        'diagnostic_frequency_rules',
        'disc_diagnostics',
        'disc_diagnostic_answers',
        'disc_public_sessions',
        'commercial_diagnostics',
        'entrepreneur_diagnostics',
        'entrepreneur_diagnostic_answers',
        'management_diagnostics',
        'management_diagnostic_partners',
        'management_diagnostic_staff',
        'productivity_diagnostics',
        'productivity_diagnostic_meta',
        'workload_diagnostics',
        'workload_diagnostic_entries',
        'service_order_diagnostics',
        'service_order_diagnostic_meta',
        'service_order_diagnostic_items',
        'collaborator_maturity_diagnostics',
        'collaborator_maturity_answers',
        'performance_matrix_diagnostics',
        'performance_matrix_meta',
        'debt_analyses',
        'debt_analysis_months',
        'debt_analysis_meta'
    ]) AS table_name
),
existentes AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
)

-- ============================================================================
-- RESULTADO 1: Tabelas PLANEJADAS que NÃO existem no PostgreSQL
-- ============================================================================
SELECT '❌ FALTA NO BANCO' AS status, p.table_name
FROM planejadas p
LEFT JOIN existentes e ON e.table_name = p.table_name
WHERE e.table_name IS NULL

UNION ALL

-- ============================================================================
-- RESULTADO 2: Tabelas que EXISTEM mas NÃO estão no plano (extras/legado)
-- ============================================================================
SELECT '⚠️ EXTRA (não planejada)' AS status, e.table_name
FROM existentes e
LEFT JOIN planejadas p ON p.table_name = e.table_name
WHERE p.table_name IS NULL

ORDER BY status, table_name;

-- ============================================================================
-- EXECUTAR BLOCO 10 — Metas / OKRs (11 tabelas: 69 a 79)
-- Execute no pgAdmin (Query Tool) — transação única
-- ============================================================================

BEGIN;

-- 69, 70, 71 — goals, area_goals, goal_history
\i '69_70_71_goals.sql'

-- 72, 73 — monthly_goal_snapshots, monthly_goal_snapshot_meta
\i '72_73_monthly_goal_snapshots.sql'

-- 74, 75 — budget_meta, budget_meta_history
\i '74_75_budget_meta.sql'

-- 76, 77 — dre_monthly, dre_monthly_detail
\i '76_77_dre_monthly.sql'

-- 78, 79 — monthly_acceleration_plans, monthly_acceleration_plan_meta
\i '78_79_monthly_acceleration_plans.sql'

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: contar tabelas criadas neste bloco
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'goals', 'area_goals', 'goal_history',
    'monthly_goal_snapshots', 'monthly_goal_snapshot_meta',
    'budget_meta', 'budget_meta_history',
    'dre_monthly', 'dre_monthly_detail',
    'monthly_acceleration_plans', 'monthly_acceleration_plan_meta'
  )
ORDER BY table_name;

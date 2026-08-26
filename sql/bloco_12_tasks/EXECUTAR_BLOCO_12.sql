-- ============================================================================
-- EXECUTAR BLOCO 12 — Tasks / Backlog (10 tabelas: 93 a 102)
-- Execute no pgAdmin (Query Tool) — copie/cole cada arquivo na ordem
-- ============================================================================

-- ORDEM DE EXECUÇÃO:
-- 1. 93_94_95_tasks.sql           → tasks, task_meta, task_time_entries
-- 2. 96_task_comments.sql         → task_comments
-- 3. 97_98_99_100_backlog_tasks.sql → backlog_tasks, backlog_task_meta,
--                                      backlog_task_history, backlog_checklist_items
-- 4. 101_102_diagnostic_actions.sql → diagnostic_actions, diagnostic_action_subtasks

-- NOTA: ActionPlan do Base44 NÃO foi duplicado — já existe como
--       diagnostic_action_plans (Bloco 09). Action e Subtask são filhos dela.

-- ============================================================================
-- VERIFICAÇÃO: contar tabelas criadas neste bloco
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'tasks', 'task_meta', 'task_time_entries',
    'task_comments',
    'backlog_tasks', 'backlog_task_meta',
    'backlog_task_history', 'backlog_checklist_items',
    'diagnostic_actions', 'diagnostic_action_subtasks'
  )
ORDER BY table_name;

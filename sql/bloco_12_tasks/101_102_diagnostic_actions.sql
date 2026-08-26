-- ============================================================================
-- Arquivo: 101_102_diagnostic_actions.sql
-- Bloco: Tasks / Backlog (Tabelas 93 a 102)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Ações individuais de planos de ação diagnósticos e suas
--            subtarefas. Filhos de diagnostic_action_plans (Bloco 09).
--            2 tabelas:
--              101. diagnostic_actions          (ações do plano)
--              102. diagnostic_action_subtasks  (subtarefas da ação)
-- Origem Base44: Action, Subtask
--
-- CONFORMIDADE:
--   ✓ FK → diagnostic_action_plans(id) existente no Bloco 09 — CASCADE
--   ✓ FK → diagnostics(id) existente no Bloco 09 — SET NULL (rastreio)
--   ✓ Fotografia: responsible_user_id SET NULL
--   ✓ Mão dupla async: concluido com completed_at
--   ✓ OVERLAP EVITADO: ActionPlan do Base44 JÁ EXISTE como
--     diagnostic_action_plans — não duplicado. Action/Subtask são filhos.
--   ✓ Não conflita com consulting_sprint_tasks (Bloco 07)
--   ✓ Não conflita com backlog_tasks (Bloco 12 #97)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 101. AÇÕES DE DIAGNÓSTICO (filhas de diagnostic_action_plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnostic_actions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS (Bloco 09)
    -- ========================================
    action_plan_id        UUID NOT NULL REFERENCES diagnostic_action_plans(id) ON DELETE CASCADE,
    diagnostic_id         UUID REFERENCES diagnostics(id) ON DELETE SET NULL,

    -- ========================================
    -- DADOS DA AÇÃO
    -- ========================================
    title                 VARCHAR(500) NOT NULL,
    description           TEXT,
    category              VARCHAR(15) NOT NULL CHECK (category IN (
                            'vendas', 'prospeccao', 'precificacao', 'pessoas'
                          )),

    -- ========================================
    -- STATUS E PRAZO
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'a_fazer' CHECK (status IN (
                            'a_fazer', 'em_andamento', 'concluido'
                          )),
    deadline_days         INTEGER CHECK (deadline_days IS NULL OR deadline_days >= 0),
    due_date              DATE,
    display_order         INTEGER NOT NULL DEFAULT 0,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_da_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_da_plan             ON diagnostic_actions(action_plan_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_da_diagnostic       ON diagnostic_actions(diagnostic_id) WHERE diagnostic_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_da_status           ON diagnostic_actions(action_plan_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_da_category         ON diagnostic_actions(action_plan_id, category) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_da_updated_at ON diagnostic_actions;
CREATE TRIGGER trg_da_updated_at
    BEFORE UPDATE ON diagnostic_actions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE diagnostic_actions IS 'Ações individuais do plano diagnóstico. FK diagnostic_action_plans (Bloco 09). 4 categorias. CASCADE no plano pai. diagnostic_id SET NULL (rastreio cruzado).';


-- ============================================================================
-- 102. SUBTAREFAS DE AÇÕES DIAGNÓSTICAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnostic_action_subtasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    action_id             UUID NOT NULL REFERENCES diagnostic_actions(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DA SUBTAREFA
    -- ========================================
    title                 VARCHAR(500) NOT NULL,
    description           TEXT,
    display_order         INTEGER NOT NULL DEFAULT 0,

    -- ========================================
    -- RESPONSÁVEL (SET NULL — fotografia)
    -- ========================================
    responsible_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- STATUS E PRAZO
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'a_fazer' CHECK (status IN (
                            'a_fazer', 'em_andamento', 'concluido'
                          )),
    due_date              DATE,
    completed_at          TIMESTAMPTZ,
    is_overdue            BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_das_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0),

    CONSTRAINT chk_das_completed_coerencia
        CHECK (
            NOT (status = 'concluido' AND completed_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_das_action          ON diagnostic_action_subtasks(action_id);
CREATE INDEX IF NOT EXISTS idx_das_responsible     ON diagnostic_action_subtasks(responsible_user_id) WHERE responsible_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_das_status          ON diagnostic_action_subtasks(action_id, status);

DROP TRIGGER IF EXISTS trg_das_updated_at ON diagnostic_action_subtasks;
CREATE TRIGGER trg_das_updated_at
    BEFORE UPDATE ON diagnostic_action_subtasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE diagnostic_action_subtasks IS 'Subtarefas da ação diagnóstica. CASCADE na ação pai. Async-friendly: concluido exige completed_at. responsible SET NULL (fotografia).';

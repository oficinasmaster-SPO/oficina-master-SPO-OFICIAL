-- ============================================================================
-- Arquivo: 78_79_monthly_acceleration_plans.sql
-- Bloco: Metas / OKRs (Tabelas 69 a 79)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Plano mensal de aceleração — gerado a partir de diagnóstico,
--            com objetivo 90 dias, pilares, timeline e indicadores.
--            2 tabelas:
--              78. monthly_acceleration_plans      (core — fase, versão, status)
--              79. monthly_acceleration_plan_meta  (1:1 — plan_data JSONB,
--                                                   feedback JSONB)
-- Origem Base44: MonthlyAccelerationPlan
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 78. PLANOS MENSAIS DE ACELERAÇÃO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_acceleration_plans (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PERÍODO E FASE
    -- ========================================
    reference_month       VARCHAR(7) NOT NULL,
    phase                 SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 4),

    -- ========================================
    -- DIAGNÓSTICO DE ORIGEM (SET NULL — fotografia)
    -- ========================================
    diagnostic_id         UUID REFERENCES diagnostics(id) ON DELETE SET NULL,

    -- ========================================
    -- VERSIONAMENTO
    -- ========================================
    version               INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),

    -- ========================================
    -- STATUS
    -- ========================================
    status                VARCHAR(12) NOT NULL DEFAULT 'ativo' CHECK (status IN (
                            'ativo', 'refinado', 'concluido', 'arquivado'
                          )),
    completion_percentage NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (
                            completion_percentage >= 0 AND completion_percentage <= 100
                          ),

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
    CONSTRAINT chk_map_month_format
        CHECK (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_map_workshop_month_phase_version
    ON monthly_acceleration_plans (workshop_id, reference_month, phase, version)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_map_workshop         ON monthly_acceleration_plans(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_map_status           ON monthly_acceleration_plans(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_map_month            ON monthly_acceleration_plans(workshop_id, reference_month) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_map_diagnostic       ON monthly_acceleration_plans(workshop_id, diagnostic_id) WHERE diagnostic_id IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_map_updated_at ON monthly_acceleration_plans;
CREATE TRIGGER trg_map_updated_at
    BEFORE UPDATE ON monthly_acceleration_plans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE monthly_acceleration_plans IS 'Plano mensal de aceleração. Fase 1-4, versionado. UNIQUE (workshop, mês, fase, versão). Diagnostic SET NULL. Status: ativo/refinado/concluido/arquivado.';


-- ============================================================================
-- 79. META DO PLANO DE ACELERAÇÃO (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_acceleration_plan_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id               UUID NOT NULL UNIQUE REFERENCES monthly_acceleration_plans(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DO PLANO (estrutura IA)
    -- ========================================
    plan_data             JSONB NOT NULL DEFAULT '{
        "diagnostic_summary": null,
        "main_objective_90_days": null,
        "pillar_directions": [],
        "timeline_plan": null,
        "implementation_schedule": [],
        "key_indicators": [],
        "next_steps_week": []
    }'::jsonb,

    -- ========================================
    -- FEEDBACK DO USUÁRIO
    -- ========================================
    user_feedback         JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_mapm_updated_at ON monthly_acceleration_plan_meta;
CREATE TRIGGER trg_mapm_updated_at
    BEFORE UPDATE ON monthly_acceleration_plan_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE monthly_acceleration_plan_meta IS 'Meta 1:1 do plano de aceleração. plan_data JSONB (objetivo 90 dias, pilares, timeline, indicadores, próximos passos). user_feedback array JSONB. CASCADE no pai.';

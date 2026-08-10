-- ============================================================================
-- Arquivo: 64_workload_diagnostics.sql
-- Bloco: Diagnósticos (Tabelas 55 a 68)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Diagnóstico de carga de trabalho — mapeia horas trabalhadas vs
--            horas ideais por colaborador, identifica sobrecarregados e
--            subutilizados, sugere redistribuição.
--            Normalizado em 2 tabelas:
--              64a. workload_diagnostics         (core — período, saúde, análise)
--              64b. workload_diagnostic_entries   (carga por colaborador)
-- Origem Base44: WorkloadDiagnostic (7 campos)
-- Status DBA: Aprovado sem alterações
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 64a. DIAGNÓSTICO DE CARGA DE TRABALHO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workload_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PERÍODO DE ANÁLISE
    -- ========================================
    period_start          DATE NOT NULL,
    period_end            DATE NOT NULL,

    -- ========================================
    -- SAÚDE GERAL DA EQUIPE
    -- ========================================
    overall_health        VARCHAR(15) CHECK (overall_health IN (
                            'saudavel', 'atencao', 'critico'
                          )),

    -- ========================================
    -- RESULTADO DA ANÁLISE (output calculado)
    -- ========================================
    analysis_results      JSONB NOT NULL DEFAULT '{
        "overloaded_employees": [],
        "underutilized_employees": [],
        "redistribution_suggestions": []
    }'::jsonb,

    -- ========================================
    -- ESTADO
    -- ========================================
    completed             BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at          TIMESTAMPTZ,

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
    CONSTRAINT chk_wd_period_coerencia
        CHECK (period_end >= period_start),

    CONSTRAINT chk_wd_completed_coerencia
        CHECK (
            (completed IS TRUE AND overall_health IS NOT NULL AND completed_at IS NOT NULL)
            OR (completed IS FALSE AND completed_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_wd_workshop       ON workload_diagnostics(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_wd_period         ON workload_diagnostics(workshop_id, period_start, period_end) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_wd_completed      ON workload_diagnostics(workshop_id, completed) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_wd_health         ON workload_diagnostics(workshop_id, overall_health) WHERE completed IS TRUE AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_wd_updated_at ON workload_diagnostics;
CREATE TRIGGER trg_wd_updated_at
    BEFORE UPDATE ON workload_diagnostics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE workload_diagnostics IS 'Diag. carga de trabalho. period_end >= period_start. Completed exige overall_health + completed_at. analysis_results JSONB com listas de sobrecarregados, subutilizados e sugestões de redistribuição.';


-- ============================================================================
-- 64b. CARGA POR COLABORADOR (normalizado do array workload_data[])
-- ============================================================================
CREATE TABLE IF NOT EXISTS workload_diagnostic_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES workload_diagnostics(id) ON DELETE CASCADE,

    -- ========================================
    -- COLABORADOR (SET NULL — fotografia histórica)
    -- ========================================
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    position_title        VARCHAR(100) NOT NULL,

    -- ========================================
    -- HORAS
    -- ========================================
    weekly_hours_worked   NUMERIC(5,2) NOT NULL CHECK (weekly_hours_worked >= 0),
    ideal_weekly_hours    NUMERIC(5,2) NOT NULL CHECK (ideal_weekly_hours > 0),

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_wde_position_not_empty
        CHECK (LENGTH(TRIM(position_title)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wde_diagnostic_employee
    ON workload_diagnostic_entries (diagnostic_id, employee_id)
    WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wde_diagnostic    ON workload_diagnostic_entries(diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_wde_employee      ON workload_diagnostic_entries(employee_id) WHERE employee_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_wde_updated_at ON workload_diagnostic_entries;
CREATE TRIGGER trg_wde_updated_at
    BEFORE UPDATE ON workload_diagnostic_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE workload_diagnostic_entries IS 'Carga de trabalho por colaborador. Horas trabalhadas vs ideais. employee_id SET NULL (fotografia histórica). position_title obrigatório. CASCADE no pai.';

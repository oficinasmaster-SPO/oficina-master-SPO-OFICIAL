-- ============================================================================
-- SCRIPT CONSOLIDADO — 8 TABELAS PENDENTES DO BLOCO 09
-- Executar de uma vez no pgAdmin (Query Tool)
-- Após execução: pgAdmin mostrará 109 tabelas (101 + 8)
-- ============================================================================
-- Tabelas criadas:
--   1. disc_diagnostics              (58a)
--   2. disc_diagnostic_answers       (58b)
--   3. disc_public_sessions          (59)
--   4. workload_diagnostics          (64a)
--   5. workload_diagnostic_entries   (64b)
--   6. service_order_diagnostics     (65a)
--   7. service_order_diagnostic_meta (65b)
--   8. service_order_diagnostic_items(65c)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ============================================================================
-- 58a. DIAGNÓSTICO DISC — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    candidate_name        VARCHAR(255),
    evaluator_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    evaluation_type       VARCHAR(10) NOT NULL DEFAULT 'self' CHECK (evaluation_type IN (
                            'manager', 'self'
                          )),
    disc_scores           JSONB NOT NULL DEFAULT '{
        "D": 0,
        "I": 0,
        "S": 0,
        "C": 0
    }'::jsonb,
    dominant_profile      VARCHAR(1) CHECK (dominant_profile IN ('D', 'I', 'S', 'C')),
    invite_id             UUID REFERENCES diagnostic_invites(id) ON DELETE SET NULL,
    completed             BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at          TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_disc_sujeito_coerencia
        CHECK (
            (employee_id IS NOT NULL AND candidate_name IS NULL)
            OR (candidate_name IS NOT NULL AND employee_id IS NULL)
        ),
    CONSTRAINT chk_disc_completed_coerencia
        CHECK (
            (completed IS TRUE AND dominant_profile IS NOT NULL AND completed_at IS NOT NULL)
            OR (completed IS FALSE AND completed_at IS NULL)
        ),
    CONSTRAINT chk_disc_candidate_name_not_empty
        CHECK (
            candidate_name IS NULL OR LENGTH(TRIM(candidate_name)) > 0
        )
);

CREATE INDEX IF NOT EXISTS idx_disc_workshop      ON disc_diagnostics(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_employee      ON disc_diagnostics(workshop_id, employee_id) WHERE employee_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_evaluator     ON disc_diagnostics(workshop_id, evaluator_id) WHERE evaluator_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_completed     ON disc_diagnostics(workshop_id, completed) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_profile       ON disc_diagnostics(workshop_id, dominant_profile) WHERE completed IS TRUE AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_disc_invite        ON disc_diagnostics(workshop_id, invite_id) WHERE invite_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_disc_updated_at ON disc_diagnostics;
CREATE TRIGGER trg_disc_updated_at
    BEFORE UPDATE ON disc_diagnostics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE disc_diagnostics IS 'Diag. DISC comportamental. Perfis D/I/S/C. Sujeito: employee XOR candidate_name. Completed exige dominant_profile + completed_at.';


-- ============================================================================
-- 58b. RESPOSTAS DISC
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_diagnostic_answers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES disc_diagnostics(id) ON DELETE CASCADE,
    question_id           VARCHAR(100) NOT NULL,
    selected_profile      VARCHAR(1) NOT NULL CHECK (selected_profile IN ('D', 'I', 'S', 'C')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_disc_answer_question
    ON disc_diagnostic_answers (diagnostic_id, question_id);

DROP TRIGGER IF EXISTS trg_disc_ans_updated_at ON disc_diagnostic_answers;
CREATE TRIGGER trg_disc_ans_updated_at
    BEFORE UPDATE ON disc_diagnostic_answers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE disc_diagnostic_answers IS 'Respostas DISC. Perfil D/I/S/C por pergunta. UNIQUE (diagnostic_id, question_id). CASCADE no pai.';


-- ============================================================================
-- 59. SESSÕES PÚBLICAS DISC
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_public_sessions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
    diagnostic_id         UUID REFERENCES disc_diagnostics(id) ON DELETE SET NULL,
    access_token          VARCHAR(255) NOT NULL,
    respondent_name       VARCHAR(255) NOT NULL,
    respondent_email      VARCHAR(320),
    status                VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN (
                            'pending', 'in_progress', 'completed', 'expired'
                          )),
    expires_at            TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_dps_respondent_name_not_empty
        CHECK (LENGTH(TRIM(respondent_name)) > 0),
    CONSTRAINT chk_dps_token_not_empty
        CHECK (LENGTH(TRIM(access_token)) > 0),
    CONSTRAINT chk_dps_completed_coerencia
        CHECK (
            (status = 'completed' AND diagnostic_id IS NOT NULL)
            OR (status != 'completed')
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dps_token
    ON disc_public_sessions (access_token) WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_dps_workshop       ON disc_public_sessions(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_dps_status         ON disc_public_sessions(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_dps_diagnostic     ON disc_public_sessions(workshop_id, diagnostic_id) WHERE diagnostic_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_dps_updated_at ON disc_public_sessions;
CREATE TRIGGER trg_dps_updated_at
    BEFORE UPDATE ON disc_public_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE disc_public_sessions IS 'Sessão pública DISC via link. Token único. Completed exige diagnostic_id. Respondente externo com nome obrigatório.';


-- ============================================================================
-- 64a. DIAGNÓSTICO DE CARGA DE TRABALHO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workload_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
    period_start          DATE NOT NULL,
    period_end            DATE NOT NULL,
    overall_health        VARCHAR(15) CHECK (overall_health IN (
                            'saudavel', 'atencao', 'critico'
                          )),
    analysis_results      JSONB NOT NULL DEFAULT '{
        "overloaded_employees": [],
        "underutilized_employees": [],
        "redistribution_suggestions": []
    }'::jsonb,
    completed             BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at          TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

COMMENT ON TABLE workload_diagnostics IS 'Diag. carga de trabalho. period_end >= period_start. Completed exige overall_health + completed_at.';


-- ============================================================================
-- 64b. CARGA POR COLABORADOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS workload_diagnostic_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES workload_diagnostics(id) ON DELETE CASCADE,
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    position_title        VARCHAR(100) NOT NULL,
    weekly_hours_worked   NUMERIC(5,2) NOT NULL CHECK (weekly_hours_worked >= 0),
    ideal_weekly_hours    NUMERIC(5,2) NOT NULL CHECK (ideal_weekly_hours > 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

COMMENT ON TABLE workload_diagnostic_entries IS 'Carga por colaborador. Horas trabalhadas vs ideais. SET NULL fotografia histórica. CASCADE no pai.';


-- ============================================================================
-- 65a. DIAGNÓSTICO DE OS — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consulting_firm_id    UUID REFERENCES consulting_firms(id) ON DELETE RESTRICT,
    company_id            UUID REFERENCES companies(id) ON DELETE RESTRICT,
    workshop_id           UUID REFERENCES workshops(id) ON DELETE RESTRICT,
    evaluator_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    os_number             VARCHAR(50) NOT NULL,
    reference_month       VARCHAR(7) NOT NULL,
    productive_technicians INTEGER NOT NULL DEFAULT 0 CHECK (productive_technicians >= 0),
    monthly_hours          NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (monthly_hours >= 0),
    operational_costs     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (operational_costs >= 0),
    people_costs          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (people_costs >= 0),
    prolabore             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (prolabore >= 0),
    ideal_hour_value      NUMERIC(14,2) CHECK (ideal_hour_value IS NULL OR ideal_hour_value >= 0),
    current_hour_value    NUMERIC(14,2) CHECK (current_hour_value IS NULL OR current_hour_value >= 0),
    tcmp2_value           NUMERIC(14,2) CHECK (tcmp2_value IS NULL OR tcmp2_value >= 0),
    tcmp2_percentage      NUMERIC(7,4) CHECK (tcmp2_percentage IS NULL OR tcmp2_percentage >= 0),
    classification        VARCHAR(20) CHECK (classification IN (
                            'excelente', 'bom', 'regular',
                            'atencao', 'critico'
                          )),
    completed             BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at          TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_sod_scope_coerencia
        CHECK (
            (consulting_firm_id IS NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (consulting_firm_id IS NOT NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (workshop_id IS NOT NULL)
        ),
    CONSTRAINT chk_sod_reference_month_format
        CHECK (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    CONSTRAINT chk_sod_os_not_empty
        CHECK (LENGTH(TRIM(os_number)) > 0),
    CONSTRAINT chk_sod_completed_coerencia
        CHECK (
            (completed IS TRUE AND classification IS NOT NULL AND completed_at IS NOT NULL)
            OR (completed IS FALSE AND completed_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_sod_workshop       ON service_order_diagnostics(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_evaluator      ON service_order_diagnostics(workshop_id, evaluator_id) WHERE evaluator_id IS NOT NULL AND is_active IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sod_os_month_workshop
    ON service_order_diagnostics (workshop_id, os_number, reference_month)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_sod_os_number      ON service_order_diagnostics(workshop_id, os_number) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_ref_month      ON service_order_diagnostics(workshop_id, reference_month) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_completed      ON service_order_diagnostics(workshop_id, completed) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_classification ON service_order_diagnostics(workshop_id, classification) WHERE completed IS TRUE AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_sod_updated_at ON service_order_diagnostics;
CREATE TRIGGER trg_sod_updated_at
    BEFORE UPDATE ON service_order_diagnostics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostics IS 'Diag. OS financeiro. Escopo Triplo. UNIQUE OS por oficina/mês. TCMP2. Completed exige classification + completed_at.';


-- ============================================================================
-- 65b. META DO DIAGNÓSTICO DE OS (1:1)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostic_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL UNIQUE REFERENCES service_order_diagnostics(id) ON DELETE CASCADE,
    totals                JSONB NOT NULL DEFAULT '{}'::jsonb,
    percentages           JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations       JSONB NOT NULL DEFAULT '[]'::jsonb,
    checklist             JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_sodm_updated_at ON service_order_diagnostic_meta;
CREATE TRIGGER trg_sodm_updated_at
    BEFORE UPDATE ON service_order_diagnostic_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostic_meta IS 'Meta 1:1 do diag. OS. JSONB: totals, percentages, recommendations[], checklist. CASCADE no pai.';


-- ============================================================================
-- 65c. ITENS DO DIAGNÓSTICO DE OS
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostic_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES service_order_diagnostics(id) ON DELETE CASCADE,
    item_type             VARCHAR(20) NOT NULL CHECK (item_type IN (
                            'peca', 'servico', 'servico_terceiro'
                          )),
    description           VARCHAR(500) NOT NULL,
    quantity              NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_value            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
    total_value           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_sodi_description_not_empty
        CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT chk_sodi_math_coerencia
        CHECK (total_value = (quantity * unit_value))
);

CREATE INDEX IF NOT EXISTS idx_sodi_diagnostic   ON service_order_diagnostic_items(diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_sodi_type         ON service_order_diagnostic_items(diagnostic_id, item_type);

DROP TRIGGER IF EXISTS trg_sodi_updated_at ON service_order_diagnostic_items;
CREATE TRIGGER trg_sodi_updated_at
    BEFORE UPDATE ON service_order_diagnostic_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostic_items IS 'Itens do diag. OS. quantity > 0, math coercion total_value = quantity * unit_value. CASCADE no pai.';

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: execute após o script para confirmar
-- ============================================================================
-- SELECT COUNT(*) AS total_tabelas FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Esperado: 109
-- ============================================================================

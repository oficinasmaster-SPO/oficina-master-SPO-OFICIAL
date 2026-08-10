-- ============================================================================
-- Arquivo: 58_59_disc_diagnostics.sql
-- Bloco: Diagnósticos (Tabelas 55 a 68)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Diagnóstico DISC — perfil comportamental (Dominância, Influência,
--            Estabilidade, Conformidade). Suporta autoavaliação e avaliação
--            por gestor, com vínculo a convites externos.
--            Normalizado em 3 tabelas:
--              58a. disc_diagnostics         (core — scores, perfil dominante)
--              58b. disc_diagnostic_answers   (respostas normalizadas)
--              59.  disc_public_sessions      (sessões públicas via link)
-- Origem Base44: DISCDiagnostic, DISCPublicSession
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 58a. DIAGNÓSTICO DISC — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- SUJEITO AVALIADO (colaborador OU candidato externo por nome)
    -- ========================================
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    candidate_name        VARCHAR(255),

    -- ========================================
    -- AVALIADOR (SET NULL — fotografia histórica)
    -- ========================================
    evaluator_id          UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- TIPO DE AVALIAÇÃO
    -- ========================================
    evaluation_type       VARCHAR(10) NOT NULL DEFAULT 'self' CHECK (evaluation_type IN (
                            'manager', 'self'
                          )),

    -- ========================================
    -- RESULTADO — SCORES DISC
    -- ========================================
    disc_scores           JSONB NOT NULL DEFAULT '{
        "D": 0,
        "I": 0,
        "S": 0,
        "C": 0
    }'::jsonb,

    dominant_profile      VARCHAR(1) CHECK (dominant_profile IN ('D', 'I', 'S', 'C')),

    -- ========================================
    -- VÍNCULO COM CONVITE (quando veio via link externo)
    -- ========================================
    invite_id             UUID REFERENCES diagnostic_invites(id) ON DELETE SET NULL,

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

COMMENT ON TABLE disc_diagnostics IS 'Diag. DISC comportamental. Perfis D/I/S/C. Sujeito: employee XOR candidate_name. Completed exige dominant_profile + completed_at. Fotografia histórica com SET NULL.';


-- ============================================================================
-- 58b. RESPOSTAS DISC (normalizado do array answers[])
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_diagnostic_answers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES disc_diagnostics(id) ON DELETE CASCADE,

    -- ========================================
    -- RESPOSTA
    -- ========================================
    question_id           VARCHAR(100) NOT NULL,
    selected_profile      VARCHAR(1) NOT NULL CHECK (selected_profile IN ('D', 'I', 'S', 'C')),

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_disc_answer_question
    ON disc_diagnostic_answers (diagnostic_id, question_id);

DROP TRIGGER IF EXISTS trg_disc_ans_updated_at ON disc_diagnostic_answers;
CREATE TRIGGER trg_disc_ans_updated_at
    BEFORE UPDATE ON disc_diagnostic_answers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE disc_diagnostic_answers IS 'Respostas do diag. DISC. Perfil selecionado D/I/S/C por pergunta. question_id único por diagnóstico. CASCADE no pai.';


-- ============================================================================
-- 59. SESSÕES PÚBLICAS DISC (via link externo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS disc_public_sessions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- VÍNCULO COM DIAGNÓSTICO (preenchido após conclusão)
    -- ========================================
    diagnostic_id         UUID REFERENCES disc_diagnostics(id) ON DELETE SET NULL,

    -- ========================================
    -- TOKEN DE ACESSO PÚBLICO
    -- ========================================
    access_token          VARCHAR(255) NOT NULL,

    -- ========================================
    -- DADOS DO RESPONDENTE EXTERNO
    -- ========================================
    respondent_name       VARCHAR(255) NOT NULL,
    respondent_email      VARCHAR(320),

    -- ========================================
    -- ESTADO
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'pending' CHECK (status IN (
                            'pending', 'in_progress', 'completed', 'expired'
                          )),
    expires_at            TIMESTAMPTZ,

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

COMMENT ON TABLE disc_public_sessions IS 'Sessão pública DISC via link. Token único. Completed exige diagnostic_id vinculado. Expira por TIMESTAMPTZ. Respondente externo com nome obrigatório.';

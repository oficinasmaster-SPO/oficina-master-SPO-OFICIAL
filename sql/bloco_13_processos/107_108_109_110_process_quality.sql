-- ============================================================================
-- Arquivo: 107_108_109_110_process_quality.sql
-- Bloco: Processos / Qualidade (Tabelas 103 a 113)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Indicadores de processo e avaliações de qualidade.
--            4 tabelas:
--              107. process_indicators       (KPIs de processo — core)
--              108. process_indicator_meta   (1:1 — histórico, reuniões, anexos)
--              109. process_assessments      (avaliação de processo — core)
--              110. process_assessment_meta  (1:1 — respostas, IA, pontuações)
-- Origem Base44: ProcessIndicator (~15 campos), ProcessAssessment (~12 campos)
--
-- CONFORMIDADE:
--   ✓ Cinturão Multi-Tenant — workshop_id NOT NULL, indexes prefixados
--   ✓ FK process_documents(id) — CASCADE em indicators
--   ✓ Core+Meta split — historical_data e answers JSONB pesados
--   ✓ Fotografia: responsible_id e evaluator_id SET NULL
--   ✓ Mão dupla async: completed com average_score
--   ✓ NUMERIC(14,2) monetário, NUMERIC(7,4) percentual
--   ✓ Não conflita com employee_kpis (Bloco 03) — aquele é RH, este é processo
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 107. INDICADORES DE PROCESSO (KPIs) — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_indicators (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    process_id            UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- DADOS DO INDICADOR
    -- ========================================
    name                  VARCHAR(300) NOT NULL,
    description           TEXT,
    measurement_type      VARCHAR(12) NOT NULL CHECK (measurement_type IN (
                            'numero', 'percentual', 'tempo', 'monetario'
                          )),
    measurement_frequency VARCHAR(12) NOT NULL DEFAULT 'mensal' CHECK (measurement_frequency IN (
                            'diario', 'semanal', 'quinzenal',
                            'mensal', 'trimestral', 'anual'
                          )),

    -- ========================================
    -- VALORES
    -- ========================================
    target_value          NUMERIC(14,2),
    current_value         NUMERIC(14,2),

    -- ========================================
    -- FÓRMULA E FONTE
    -- ========================================
    calculation_formula   TEXT,
    data_source           VARCHAR(200),

    -- ========================================
    -- RESPONSÁVEL (SET NULL — fotografia)
    -- ========================================
    responsible_id        UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- STATUS
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'ativo' CHECK (status IN (
                            'ativo', 'inativo', 'em_definicao'
                          )),

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
    CONSTRAINT chk_pind_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pind_workshop       ON process_indicators(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pind_process        ON process_indicators(workshop_id, process_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pind_status         ON process_indicators(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pind_responsible    ON process_indicators(workshop_id, responsible_id) WHERE responsible_id IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_pind_updated_at ON process_indicators;
CREATE TRIGGER trg_pind_updated_at
    BEFORE UPDATE ON process_indicators
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_indicators IS 'KPIs de processo. FK process_documents CASCADE. 4 tipos de medição, 6 frequências. responsible SET NULL. Não conflita com employee_kpis (Bloco 03).';


-- ============================================================================
-- 108. META DO INDICADOR DE PROCESSO (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_indicator_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id          UUID NOT NULL UNIQUE REFERENCES process_indicators(id) ON DELETE CASCADE,

    -- ========================================
    -- HISTÓRICO DE MEDIÇÕES
    -- ========================================
    historical_data       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- REUNIÕES DE ANÁLISE
    -- ========================================
    analysis_meetings     JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- ANEXOS (planilhas, relatórios, gráficos)
    -- ========================================
    attachments           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_pindm_updated_at ON process_indicator_meta;
CREATE TRIGGER trg_pindm_updated_at
    BEFORE UPDATE ON process_indicator_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_indicator_meta IS 'Meta 1:1 do indicador. JSONB: historical_data[] (período+valor), analysis_meetings[] (data+participantes+ata), attachments[]. CASCADE no pai.';


-- ============================================================================
-- 109. AVALIAÇÕES DE PROCESSO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_assessments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- AVALIADOR (SET NULL — fotografia)
    -- ========================================
    evaluator_id          UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- TIPO DE AVALIAÇÃO
    -- ========================================
    assessment_type       VARCHAR(15) NOT NULL CHECK (assessment_type IN (
                            'vendas', 'comercial', 'marketing', 'pessoas',
                            'financeiro', 'empresarial', 'area_geral', 'ma3'
                          )),

    -- ========================================
    -- RESULTADO
    -- ========================================
    average_score         NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (average_score >= 0 AND average_score <= 10),
    completed             BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pass_workshop       ON process_assessments(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pass_type           ON process_assessments(workshop_id, assessment_type) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pass_evaluator      ON process_assessments(workshop_id, evaluator_id) WHERE evaluator_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pass_completed      ON process_assessments(workshop_id, completed) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_pass_updated_at ON process_assessments;
CREATE TRIGGER trg_pass_updated_at
    BEFORE UPDATE ON process_assessments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_assessments IS 'Avaliação de processo por tipo (8 áreas). average_score 0-10. evaluator SET NULL (fotografia). Não conflita com diagnostics (Bloco 09).';


-- ============================================================================
-- 110. META DA AVALIAÇÃO DE PROCESSO (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_assessment_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id         UUID NOT NULL UNIQUE REFERENCES process_assessments(id) ON DELETE CASCADE,

    -- ========================================
    -- RESPOSTAS DETALHADAS
    -- ========================================
    answers               JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- PONTUAÇÕES POR CRITÉRIO
    -- ========================================
    scores                JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ========================================
    -- ANÁLISE
    -- ========================================
    strengths             JSONB NOT NULL DEFAULT '[]'::jsonb,
    weaknesses            JSONB NOT NULL DEFAULT '[]'::jsonb,
    bottlenecks           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- IA
    -- ========================================
    ai_recommendations    TEXT,
    user_feedback         TEXT,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_passm_updated_at ON process_assessment_meta;
CREATE TRIGGER trg_passm_updated_at
    BEFORE UPDATE ON process_assessment_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_assessment_meta IS 'Meta 1:1 da avaliação. JSONB: answers[], scores{}, strengths[], weaknesses[], bottlenecks[]. ai_recommendations TEXT. CASCADE no pai.';

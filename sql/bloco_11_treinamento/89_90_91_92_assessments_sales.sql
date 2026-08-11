-- ============================================================================
-- Arquivo: 89_90_91_92_assessments_sales.sql
-- Bloco: Treinamento / Academia (Tabelas 80 a 92)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Avaliações de aulas, resultados, histórico de conteúdo e
--            treinamento de vendas com IA.
--            4 tabelas:
--              89. lesson_assessments        (avaliações: quiz/exercise/poll)
--              90. lesson_assessment_results  (resultados por colaborador)
--              91. lesson_content_history     (auditoria de conteúdo — imutável)
--              92. sales_trainings            (simulação de vendas com IA)
-- Origem Base44: LessonAssessment, LessonAssessmentResult,
--                LessonContentHistory, SalesTraining
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 89. AVALIAÇÕES DE AULA
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_assessments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- HIERARQUIA
    -- ========================================
    lesson_id             UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DA AVALIAÇÃO
    -- ========================================
    assessment_type       VARCHAR(10) NOT NULL CHECK (assessment_type IN (
                            'quiz', 'exercise', 'poll'
                          )),
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,

    -- ========================================
    -- PERGUNTAS (JSONB array)
    -- ========================================
    questions             JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- IA
    -- ========================================
    ai_prompt_template    TEXT,

    -- ========================================
    -- CRITÉRIO DE APROVAÇÃO
    -- ========================================
    passing_score         NUMERIC(7,4) NOT NULL DEFAULT 70 CHECK (
                            passing_score >= 0 AND passing_score <= 100
                          ),

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_la_lesson           ON lesson_assessments(lesson_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_la_type             ON lesson_assessments(lesson_id, assessment_type) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_la_updated_at ON lesson_assessments;
CREATE TRIGGER trg_la_updated_at
    BEFORE UPDATE ON lesson_assessments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE lesson_assessments IS 'Avaliações de aula: quiz/exercise/poll. questions JSONB array. passing_score 0-100. ai_prompt_template para feedback IA. CASCADE na aula.';


-- ============================================================================
-- 90. RESULTADOS DE AVALIAÇÃO
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_assessment_results (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    assessment_id         UUID NOT NULL REFERENCES lesson_assessments(id) ON DELETE CASCADE,
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ========================================
    -- RESULTADO
    -- ========================================
    score                 NUMERIC(7,4) NOT NULL CHECK (score >= 0 AND score <= 100),
    passed                BOOLEAN NOT NULL DEFAULT FALSE,
    answers               JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_feedback           TEXT,

    -- ========================================
    -- TENTATIVA
    -- ========================================
    attempt_number        INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    attempt_date          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONTROLE (imutável — cada tentativa é um registro)
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lar_assessment      ON lesson_assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_lar_user            ON lesson_assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_lar_employee        ON lesson_assessment_results(employee_id) WHERE employee_id IS NOT NULL;

COMMENT ON TABLE lesson_assessment_results IS 'Resultados de avaliação por tentativa. Imutável. score 0-100, passed boolean, answers JSONB, ai_feedback. employee SET NULL (fotografia).';


-- ============================================================================
-- 91. HISTÓRICO DE CONTEÚDO DE AULA (timeline imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_content_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    lesson_id             UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,

    -- ========================================
    -- ALTERAÇÃO
    -- ========================================
    changed_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    change_type           VARCHAR(20) NOT NULL CHECK (change_type IN (
                            'content_update', 'assessment_update',
                            'rules_update', 'metadata_update'
                          )),
    previous_value        JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_value             JSONB NOT NULL DEFAULT '{}'::jsonb,
    change_reason         TEXT,

    -- ========================================
    -- IMPACTO
    -- ========================================
    impacted_students_count INTEGER NOT NULL DEFAULT 0 CHECK (impacted_students_count >= 0),

    -- ========================================
    -- CONTROLE (imutável — sem updated_at)
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lch_lesson          ON lesson_content_history(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lch_change_type     ON lesson_content_history(lesson_id, change_type);

COMMENT ON TABLE lesson_content_history IS 'Auditoria imutável de alterações de conteúdo. change_type enum, previous/new value JSONB, impacted_students. Sem updated_at.';


-- ============================================================================
-- 92. TREINAMENTO DE VENDAS (simulação com IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_trainings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PARTICIPANTE
    -- ========================================
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ========================================
    -- CENÁRIO
    -- ========================================
    scenario_type         VARCHAR(30) NOT NULL CHECK (scenario_type IN (
                            'objecao_preco', 'cliente_indeciso',
                            'reclamacao_servico', 'venda_servico_adicional',
                            'negociacao_desconto', 'fechamento_venda',
                            'prospeccao_cliente', 'pos_venda'
                          )),

    -- ========================================
    -- ÁUDIO E TRANSCRIÇÃO
    -- ========================================
    audio_url             VARCHAR(500),
    transcription         TEXT,
    duration_seconds      INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),

    -- ========================================
    -- AVALIAÇÃO IA
    -- ========================================
    ai_evaluation         JSONB NOT NULL DEFAULT '{
        "score": null,
        "strengths": [],
        "improvements": [],
        "feedback": null,
        "suggested_response": null
    }'::jsonb,

    -- ========================================
    -- ESTADO
    -- ========================================
    completed             BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_st_workshop         ON sales_trainings(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_st_user             ON sales_trainings(workshop_id, user_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_st_scenario         ON sales_trainings(workshop_id, scenario_type) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_st_completed        ON sales_trainings(workshop_id, completed) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_st_updated_at ON sales_trainings;
CREATE TRIGGER trg_st_updated_at
    BEFORE UPDATE ON sales_trainings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE sales_trainings IS 'Simulação de vendas com IA. 8 cenários. Áudio, transcrição, ai_evaluation JSONB (score, strengths, improvements, feedback, suggested_response).';

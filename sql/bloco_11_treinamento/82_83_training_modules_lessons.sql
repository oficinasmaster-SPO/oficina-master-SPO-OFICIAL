-- ============================================================================
-- Arquivo: 82_83_training_modules_lessons.sql
-- Bloco: Treinamento / Academia (Tabelas 80 a 92)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Módulos e aulas dos cursos de treinamento.
--            2 tabelas:
--              82. training_modules  (módulos dentro de um curso)
--              83. training_lessons  (aulas dentro de um módulo)
-- Origem Base44: TrainingModule + CourseModule (consolidados),
--                TrainingLesson + CourseLesson (consolidados)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 82. MÓDULOS DE TREINAMENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_modules (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- HIERARQUIA
    -- ========================================
    course_id             UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DO MÓDULO
    -- ========================================
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    objective             TEXT,
    expected_outcome      TEXT,
    cover_images          JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- ORDEM E STATUS
    -- ========================================
    display_order         INTEGER NOT NULL DEFAULT 0,
    status                VARCHAR(12) NOT NULL DEFAULT 'rascunho' CHECK (status IN (
                            'rascunho', 'publicado', 'ativo', 'oculto',
                            'em_revisao', 'arquivado'
                          )),

    -- ========================================
    -- DURAÇÃO E MÉTRICAS
    -- ========================================
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
    actual_avg_duration_minutes NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (actual_avg_duration_minutes >= 0),
    completion_rate       NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (completion_rate >= 0),

    -- ========================================
    -- ATRIBUIÇÃO
    -- ========================================
    target_roles          JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_to_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    last_content_update   TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tm_course           ON training_modules(course_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_tm_status           ON training_modules(course_id, status) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_tm_updated_at ON training_modules;
CREATE TRIGGER trg_tm_updated_at
    BEFORE UPDATE ON training_modules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_modules IS 'Módulos de um curso. CASCADE no curso pai. Objetivo pedagógico, duração estimada vs real, target_roles JSONB. Consolida TrainingModule + CourseModule.';


-- ============================================================================
-- 83. AULAS DE TREINAMENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_lessons (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- HIERARQUIA
    -- ========================================
    module_id             UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DA AULA
    -- ========================================
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    content_type          VARCHAR(15) NOT NULL CHECK (content_type IN (
                            'video_youtube', 'video_upload', 'text', 'pdf'
                          )),
    content_url           VARCHAR(500),
    duration_minutes      INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    display_order         INTEGER NOT NULL DEFAULT 0,

    -- ========================================
    -- TRANSCRIÇÃO (contexto para IA)
    -- ========================================
    transcript            TEXT,

    -- ========================================
    -- REGRAS DE PROGRESSÃO
    -- ========================================
    progression_rules     JSONB NOT NULL DEFAULT '{
        "can_advance_if_failed": true,
        "can_retake_assessment": true,
        "can_skip_to_assessment": true,
        "next_lesson_unlock": "always",
        "require_assessment_pass": false
    }'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tl_module           ON training_lessons(module_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_tl_content_type     ON training_lessons(module_id, content_type) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_tl_updated_at ON training_lessons;
CREATE TRIGGER trg_tl_updated_at
    BEFORE UPDATE ON training_lessons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_lessons IS 'Aulas de um módulo. CASCADE no módulo pai. content_type: video_youtube/upload/text/pdf. progression_rules JSONB. Consolida TrainingLesson + CourseLesson.';

-- ============================================================================
-- Arquivo: 80_81_training_courses.sql
-- Bloco: Treinamento / Academia (Tabelas 80 a 92)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Cursos da academia corporativa — catálogo, status, métricas.
--            2 tabelas:
--              80. training_courses      (core — título, categoria, métricas)
--              81. training_course_meta  (1:1 — capas, trailer, objetivos JSONB)
-- Origem Base44: TrainingCourse (~25 campos)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 80. CURSOS DE TREINAMENTO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_courses (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (NULL = global)
    -- ========================================
    workshop_id           UUID REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- DADOS DO CURSO
    -- ========================================
    title                 VARCHAR(300) NOT NULL,
    description           TEXT,
    category              VARCHAR(15) NOT NULL DEFAULT 'outros' CHECK (category IN (
                            'vendas', 'tecnico', 'gestao', 'comercial',
                            'marketing', 'rh', 'financeiro', 'outros'
                          )),
    difficulty_level      VARCHAR(12) NOT NULL DEFAULT 'introducao' CHECK (difficulty_level IN (
                            'introducao', 'fundamentos', 'formacao'
                          )),

    -- ========================================
    -- ESTADO E ORDEM
    -- ========================================
    status                VARCHAR(12) NOT NULL DEFAULT 'rascunho' CHECK (status IN (
                            'rascunho', 'ativo', 'inativo', 'arquivado', 'em_breve'
                          )),
    release_date          TIMESTAMPTZ,
    display_order         INTEGER NOT NULL DEFAULT 0,
    is_featured           BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- MÉTRICAS (calculadas)
    -- ========================================
    total_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_duration_minutes >= 0),
    completion_rate       NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (completion_rate >= 0),
    avg_rating            NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 10),
    total_enrollments     INTEGER NOT NULL DEFAULT 0 CHECK (total_enrollments >= 0),

    -- ========================================
    -- CONTROLE
    -- ========================================
    last_content_update   TIMESTAMPTZ,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tc_workshop         ON training_courses(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_tc_category         ON training_courses(category) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_tc_status           ON training_courses(status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_tc_featured         ON training_courses(is_featured) WHERE is_featured IS TRUE AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_tc_updated_at ON training_courses;
CREATE TRIGGER trg_tc_updated_at
    BEFORE UPDATE ON training_courses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_courses IS 'Catálogo de cursos da academia. workshop_id NULL = global. Categorias, dificuldade, status com em_breve. Métricas calculadas (conclusão, rating, matrículas).';


-- ============================================================================
-- 81. META DO CURSO (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_course_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id             UUID NOT NULL UNIQUE REFERENCES training_courses(id) ON DELETE CASCADE,

    -- ========================================
    -- MÍDIA
    -- ========================================
    cover_images          JSONB NOT NULL DEFAULT '[]'::jsonb,
    trailer_url           VARCHAR(500),

    -- ========================================
    -- CONTEÚDO PEDAGÓGICO
    -- ========================================
    impact_narratives     JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_audience       TEXT,
    learning_objectives   JSONB NOT NULL DEFAULT '[]'::jsonb,
    prerequisites         JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- ATRIBUIÇÃO
    -- ========================================
    assigned_to_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_tcm_updated_at ON training_course_meta;
CREATE TRIGGER trg_tcm_updated_at
    BEFORE UPDATE ON training_course_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_course_meta IS 'Meta 1:1 do curso. JSONB: cover_images[], impact_narratives[], learning_objectives[], prerequisites[], assigned_to_ids[]. CASCADE no pai.';

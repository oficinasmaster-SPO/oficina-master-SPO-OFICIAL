-- ============================================================================
-- Arquivo: 86_87_88_training_progress.sql
-- Bloco: Treinamento / Academia (Tabelas 80 a 92)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Progresso de treinamento, analytics de curso e lembretes.
--            3 tabelas:
--              86. training_progress  (progresso por colaborador/aula)
--              87. course_analytics   (métricas agregadas por curso/período)
--              88. course_reminders   (lembretes de cursos)
-- Origem Base44: CourseProgress + EmployeeTrainingProgress (consolidados),
--                CourseAnalytics, CourseReminder
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 86. PROGRESSO DE TREINAMENTO (consolidado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_progress (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- COLABORADOR
    -- ========================================
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ========================================
    -- HIERARQUIA DO CONTEÚDO
    -- ========================================
    course_id             UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    module_id             UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    lesson_id             UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,

    -- ========================================
    -- ESTADO
    -- ========================================
    status                VARCHAR(25) NOT NULL DEFAULT 'not_started' CHECK (status IN (
                            'not_started', 'in_progress',
                            'completed', 'completed_with_failure'
                          )),
    progress_percentage   NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (
                            progress_percentage >= 0 AND progress_percentage <= 100
                          ),

    -- ========================================
    -- TEMPO DE VISUALIZAÇÃO
    -- ========================================
    watch_time_seconds    INTEGER NOT NULL DEFAULT 0 CHECK (watch_time_seconds >= 0),
    last_watched_position NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (last_watched_position >= 0),

    -- ========================================
    -- AVALIAÇÃO
    -- ========================================
    assessment_attempts   INTEGER NOT NULL DEFAULT 0 CHECK (assessment_attempts >= 0),
    best_assessment_score NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (
                            best_assessment_score >= 0 AND best_assessment_score <= 100
                          ),

    -- ========================================
    -- DATAS
    -- ========================================
    completed_at          TIMESTAMPTZ,
    last_access_at        TIMESTAMPTZ,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_user_lesson
    ON training_progress (user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_tp_workshop         ON training_progress(workshop_id);
CREATE INDEX IF NOT EXISTS idx_tp_user_course      ON training_progress(workshop_id, user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_tp_employee         ON training_progress(workshop_id, employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tp_status           ON training_progress(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_tp_course           ON training_progress(course_id);

DROP TRIGGER IF EXISTS trg_tp_updated_at ON training_progress;
CREATE TRIGGER trg_tp_updated_at
    BEFORE UPDATE ON training_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_progress IS 'Progresso por usuário/aula. UNIQUE (user_id, lesson_id). Consolida CourseProgress + EmployeeTrainingProgress. Watch time, assessment score, status.';


-- ============================================================================
-- 87. ANALYTICS DE CURSO
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_analytics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    course_id             UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

    -- ========================================
    -- PERÍODO
    -- ========================================
    period                VARCHAR(7) NOT NULL,

    -- ========================================
    -- MÉTRICAS
    -- ========================================
    total_views           INTEGER NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    total_completions     INTEGER NOT NULL DEFAULT 0 CHECK (total_completions >= 0),
    total_watch_time_hours NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_watch_time_hours >= 0),
    average_completion_rate NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (average_completion_rate >= 0),
    unique_users          INTEGER NOT NULL DEFAULT 0 CHECK (unique_users >= 0),
    click_through_rate    NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (click_through_rate >= 0),
    active_cover_index    SMALLINT NOT NULL DEFAULT 0 CHECK (active_cover_index >= 0),

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_ca_period_format
        CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_course_period
    ON course_analytics (course_id, period);

CREATE INDEX IF NOT EXISTS idx_ca_course           ON course_analytics(course_id);

DROP TRIGGER IF EXISTS trg_ca_updated_at ON course_analytics;
CREATE TRIGGER trg_ca_updated_at
    BEFORE UPDATE ON course_analytics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE course_analytics IS 'Analytics agregado por curso/mês. UNIQUE (course_id, period). Views, completions, watch time, CTR, A/B cover index.';


-- ============================================================================
-- 88. LEMBRETES DE CURSO
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_reminders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id             UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,

    -- ========================================
    -- TIPO E ESTADO
    -- ========================================
    reminder_type         VARCHAR(20) NOT NULL CHECK (reminder_type IN (
                            'coming_soon', 'new_release', 'continue_watching'
                          )),
    notified              BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent_at  TIMESTAMPTZ,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_cr_notified_coerencia
        CHECK (
            (notified IS TRUE AND notification_sent_at IS NOT NULL)
            OR (notified IS FALSE)
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cr_user_course_type
    ON course_reminders (user_id, course_id, reminder_type);

CREATE INDEX IF NOT EXISTS idx_cr_user            ON course_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_pending         ON course_reminders(notified) WHERE notified IS FALSE;

COMMENT ON TABLE course_reminders IS 'Lembretes de curso por usuário. UNIQUE (user_id, course_id, tipo). Mão dupla: notified TRUE exige notification_sent_at.';

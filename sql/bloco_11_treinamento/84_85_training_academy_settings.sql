-- ============================================================================
-- Arquivo: 84_85_training_academy_settings.sql
-- Bloco: Treinamento / Academia (Tabelas 80 a 92)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Configurações da academia de treinamento por oficina.
--            2 tabelas:
--              84. training_academy_settings      (core — flags e enums)
--              85. training_academy_settings_meta  (1:1 — JSONB pesados)
-- Origem Base44: TrainingAcademySettings (~20 campos + sub-objetos)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 84. CONFIGURAÇÕES DA ACADEMIA — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_academy_settings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (NULL = global)
    -- ========================================
    workshop_id           UUID REFERENCES workshops(id) ON DELETE CASCADE,

    -- ========================================
    -- ESTADO GERAL
    -- ========================================
    academy_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    academy_visibility    VARCHAR(12) NOT NULL DEFAULT 'global' CHECK (academy_visibility IN (
                            'global', 'por_oficina', 'por_perfil'
                          )),
    default_access_level  VARCHAR(12) NOT NULL DEFAULT 'livre' CHECK (default_access_level IN (
                            'livre', 'restrito', 'sob_convite'
                          )),
    default_home_section  VARCHAR(20) NOT NULL DEFAULT 'continue_assistindo' CHECK (default_home_section IN (
                            'continue_assistindo', 'recomendados',
                            'novos_cursos', 'categorias'
                          )),

    -- ========================================
    -- FLAGS DE FUNCIONALIDADE
    -- ========================================
    show_progress_globally    BOOLEAN NOT NULL DEFAULT TRUE,
    allow_resume_last_lesson  BOOLEAN NOT NULL DEFAULT TRUE,
    enable_course_reminders   BOOLEAN NOT NULL DEFAULT TRUE,
    enable_analytics_tracking BOOLEAN NOT NULL DEFAULT TRUE,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tas_workshop
    ON training_academy_settings (workshop_id)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_tas_workshop        ON training_academy_settings(workshop_id) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_tas_updated_at ON training_academy_settings;
CREATE TRIGGER trg_tas_updated_at
    BEFORE UPDATE ON training_academy_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_academy_settings IS 'Config da academia por oficina. UNIQUE workshop_id. Visibilidade, acesso, home section, flags de funcionalidade.';


-- ============================================================================
-- 85. META DAS CONFIGURAÇÕES DA ACADEMIA (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS training_academy_settings_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_id           UUID NOT NULL UNIQUE REFERENCES training_academy_settings(id) ON DELETE CASCADE,

    -- ========================================
    -- CONFIGURAÇÕES DETALHADAS
    -- ========================================
    display_settings      JSONB NOT NULL DEFAULT '{
        "show_duration": true,
        "show_difficulty": true,
        "show_coming_soon": true,
        "show_course_trailer": false
    }'::jsonb,

    progress_settings     JSONB NOT NULL DEFAULT '{
        "auto_save_progress": true,
        "allow_skip_lessons": true,
        "require_sequential_completion": false,
        "mark_complete_threshold": 90
    }'::jsonb,

    reminder_settings     JSONB NOT NULL DEFAULT '{
        "new_course_reminder": true,
        "inactivity_reminder": true,
        "inactivity_days": 7,
        "incomplete_reminder": true,
        "notification_channels": ["in_app"]
    }'::jsonb,

    analytics_settings    JSONB NOT NULL DEFAULT '{
        "default_period": "mensal",
        "visible_to_roles": ["admin", "gestor"]
    }'::jsonb,

    -- ========================================
    -- CATEGORIAS PERSONALIZADAS
    -- ========================================
    custom_categories     JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- LOG DE ALTERAÇÕES
    -- ========================================
    change_log            JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_tasm_updated_at ON training_academy_settings_meta;
CREATE TRIGGER trg_tasm_updated_at
    BEFORE UPDATE ON training_academy_settings_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE training_academy_settings_meta IS 'Meta 1:1 das config da academia. JSONB: display, progress, reminder, analytics settings, custom_categories[], change_log[]. CASCADE no pai.';

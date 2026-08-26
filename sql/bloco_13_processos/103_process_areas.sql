-- ============================================================================
-- Arquivo: 103_process_areas.sql
-- Bloco: Processos / Qualidade (Tabelas 103 a 113)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Áreas de processo da oficina (catálogo: Comercial, Financeiro,
--            RH, etc). Áreas padrão do sistema (is_default) ou customizadas
--            por oficina.
--            1 tabela:
--              103. process_areas  (catálogo de áreas)
-- Origem Base44: ProcessArea (~9 campos)
--
-- CONFORMIDADE:
--   ✓ workshop_id NULL = área padrão global (mesmo padrão training_courses)
--   ✓ is_default para áreas do sistema vs customizadas
--   ✓ subcategories como JSONB array
--   ✓ Cinturão: indexes com workshop_id onde aplicável
--   ✓ Não conflita com nenhuma tabela existente
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 103. ÁREAS DE PROCESSO
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_areas (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (NULL = área padrão global)
    -- ========================================
    workshop_id           UUID REFERENCES workshops(id) ON DELETE CASCADE,

    -- ========================================
    -- DADOS DA ÁREA
    -- ========================================
    name                  VARCHAR(200) NOT NULL,
    description           TEXT,
    category              VARCHAR(10) NOT NULL DEFAULT 'geral' CHECK (category IN (
                            'geral', 'tecnica'
                          )),
    subcategories         JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- VISUAL
    -- ========================================
    icon                  VARCHAR(50),
    color                 VARCHAR(7),

    -- ========================================
    -- CLASSIFICAÇÃO
    -- ========================================
    is_default            BOOLEAN NOT NULL DEFAULT FALSE,
    display_order         INTEGER NOT NULL DEFAULT 0,

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
    CONSTRAINT chk_pa_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pa_workshop         ON process_areas(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pa_default          ON process_areas(is_default) WHERE is_default IS TRUE AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pa_category         ON process_areas(category) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_pa_updated_at ON process_areas;
CREATE TRIGGER trg_pa_updated_at
    BEFORE UPDATE ON process_areas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_areas IS 'Catálogo de áreas de processo. workshop_id NULL = padrão global. is_default para áreas do sistema. subcategories JSONB array.';

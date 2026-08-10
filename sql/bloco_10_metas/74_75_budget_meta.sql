-- ============================================================================
-- Arquivo: 74_75_budget_meta.sql
-- Bloco: Metas / OKRs (Tabelas 69 a 79)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Configuração de itens orçamentários (meta, peso sazonal,
--            sazonalidade por mês) e trilha de auditoria de alterações.
--            2 tabelas:
--              74. budget_meta           (configuração do item orçamentário)
--              75. budget_meta_history   (auditoria de alterações — imutável)
-- Origem Base44: BudgetMeta, BudgetMetaHistory
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 74. CONFIGURAÇÃO DE ITENS ORÇAMENTÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- ITEM ORÇAMENTÁRIO
    -- ========================================
    mes                   VARCHAR(7) NOT NULL,
    item                  VARCHAR(200) NOT NULL,
    categoria             VARCHAR(100),
    group_id              UUID REFERENCES budget_groups(id) ON DELETE SET NULL,

    -- ========================================
    -- TIPO E PERIODICIDADE
    -- ========================================
    tipo                  VARCHAR(10) NOT NULL CHECK (tipo IN (
                            'receita', 'despesa'
                          )),
    periodicidade         VARCHAR(10) NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN (
                            'mensal', 'anual'
                          )),

    -- ========================================
    -- METAS
    -- ========================================
    meta_percentual       NUMERIC(7,4) CHECK (meta_percentual IS NULL OR meta_percentual >= 0),
    meta_fixa_rs          NUMERIC(14,2) CHECK (meta_fixa_rs IS NULL OR meta_fixa_rs >= 0),
    peso_sazonal          NUMERIC(7,4) NOT NULL DEFAULT 1.0 CHECK (peso_sazonal >= 0),

    -- ========================================
    -- SAZONALIDADE (12 meses)
    -- ========================================
    sazonalidade_config   JSONB NOT NULL DEFAULT '{
        "jan": 1.0, "fev": 1.0, "mar": 1.0,
        "abr": 1.0, "mai": 1.0, "jun": 1.0,
        "jul": 1.0, "ago": 1.0, "set": 1.0,
        "out": 1.0, "nov": 1.0, "dez": 1.0
    }'::jsonb,

    -- ========================================
    -- CONTROLE ORÇAMENTÁRIO
    -- ========================================
    controlar_orcamento   BOOLEAN NOT NULL DEFAULT TRUE,

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
    CONSTRAINT chk_bm_mes_format
        CHECK (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),

    CONSTRAINT chk_bm_item_not_empty
        CHECK (LENGTH(TRIM(item)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bm_workshop_item_mes
    ON budget_meta (workshop_id, item, mes)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_bm_workshop          ON budget_meta(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bm_tipo              ON budget_meta(workshop_id, tipo) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bm_group             ON budget_meta(workshop_id, group_id) WHERE group_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bm_mes               ON budget_meta(workshop_id, mes) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_bm_updated_at ON budget_meta;
CREATE TRIGGER trg_bm_updated_at
    BEFORE UPDATE ON budget_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE budget_meta IS 'Config de item orçamentário. UNIQUE (workshop_id, item, mes). Tipo receita/despesa. Sazonalidade JSONB 12 meses. Peso sazonal. FK budget_groups SET NULL.';


-- ============================================================================
-- 75. AUDITORIA DE ALTERAÇÕES DE BUDGET META (timeline imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_meta_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    meta_id               UUID NOT NULL REFERENCES budget_meta(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- VERSIONAMENTO
    -- ========================================
    version               INTEGER NOT NULL CHECK (version > 0),
    field_changed         VARCHAR(100) NOT NULL,
    old_value             TEXT,
    new_value             TEXT,

    -- ========================================
    -- CONTEXTO
    -- ========================================
    reason                TEXT,
    snapshot              JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_locked_change      BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- CONTROLE (imutável — sem updated_at)
    -- ========================================
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_bmh_field_not_empty
        CHECK (LENGTH(TRIM(field_changed)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_bmh_meta             ON budget_meta_history(meta_id);
CREATE INDEX IF NOT EXISTS idx_bmh_workshop         ON budget_meta_history(workshop_id);
CREATE INDEX IF NOT EXISTS idx_bmh_workshop_version ON budget_meta_history(workshop_id, meta_id, version);

COMMENT ON TABLE budget_meta_history IS 'Auditoria imutável de budget_meta. Versão, campo alterado, old/new value, snapshot JSONB do estado completo. CASCADE no pai. Sem updated_at.';

-- ============================================================================
-- Arquivo: 76_77_dre_monthly.sql
-- Bloco: Metas / OKRs (Tabelas 69 a 79)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: DRE mensal da oficina — totais de receita, custos TCMP2,
--            custos não-TCMP2, peças e indicadores calculados.
--            2 tabelas:
--              76. dre_monthly         (core — totais e indicadores)
--              77. dre_monthly_detail  (1:1 — breakdown JSONB de receitas/custos)
-- Origem Base44: DREMonthly (~35 campos)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 76. DRE MENSAL — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dre_monthly (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PERÍODO
    -- ========================================
    month                 VARCHAR(7) NOT NULL,

    -- ========================================
    -- CAPACIDADE PRODUTIVA
    -- ========================================
    productive_technicians INTEGER NOT NULL DEFAULT 0 CHECK (productive_technicians >= 0),
    monthly_hours         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (monthly_hours >= 0),

    -- ========================================
    -- RECEITAS (totais)
    -- ========================================
    revenue_parts         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_parts >= 0),
    revenue_services      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_services >= 0),
    revenue_third_party   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_third_party >= 0),
    revenue_total         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_total >= 0),

    -- ========================================
    -- CUSTOS TCMP2 (totais)
    -- ========================================
    costs_tcmp2_total     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costs_tcmp2_total >= 0),

    -- ========================================
    -- CUSTOS NÃO-TCMP2 (totais)
    -- ========================================
    costs_not_tcmp2_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costs_not_tcmp2_total >= 0),

    -- ========================================
    -- CUSTO DE PEÇAS
    -- ========================================
    parts_cost            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
    parts_markup_pct      NUMERIC(7,4) CHECK (parts_markup_pct IS NULL OR parts_markup_pct >= 0),

    -- ========================================
    -- INDICADORES CALCULADOS
    -- ========================================
    gross_profit          NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_profit            NUMERIC(14,2) NOT NULL DEFAULT 0,
    profitability_pct     NUMERIC(7,4),
    breakeven             NUMERIC(14,2) CHECK (breakeven IS NULL OR breakeven >= 0),
    ideal_hour_value      NUMERIC(14,2) CHECK (ideal_hour_value IS NULL OR ideal_hour_value >= 0),
    current_hour_value    NUMERIC(14,2) CHECK (current_hour_value IS NULL OR current_hour_value >= 0),
    tcmp2_pct             NUMERIC(7,4) CHECK (tcmp2_pct IS NULL OR tcmp2_pct >= 0),
    contribution_margin   NUMERIC(14,2),

    -- ========================================
    -- OBSERVAÇÕES
    -- ========================================
    notes                 TEXT,

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
    CONSTRAINT chk_drem_month_format
        CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_drem_workshop_month
    ON dre_monthly (workshop_id, month)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_drem_workshop        ON dre_monthly(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_drem_month           ON dre_monthly(workshop_id, month) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_drem_updated_at ON dre_monthly;
CREATE TRIGGER trg_drem_updated_at
    BEFORE UPDATE ON dre_monthly
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE dre_monthly IS 'DRE mensal da oficina. UNIQUE (workshop_id, month). Receitas, custos TCMP2/não-TCMP2, peças, indicadores calculados (lucro, rentabilidade, ponto equilíbrio, valor hora).';


-- ============================================================================
-- 77. DETALHE DO DRE MENSAL (1:1 — breakdown JSONB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dre_monthly_detail (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dre_id                UUID NOT NULL UNIQUE REFERENCES dre_monthly(id) ON DELETE CASCADE,

    -- ========================================
    -- BREAKDOWN DE CUSTOS TCMP2
    -- ========================================
    costs_tcmp2           JSONB NOT NULL DEFAULT '{
        "salarios_produtivos": 0,
        "encargos_produtivos": 0,
        "beneficios_produtivos": 0,
        "comissoes": 0,
        "prolabore_tecnico": 0,
        "terceirizados": 0,
        "outros_tcmp2": 0
    }'::jsonb,

    -- ========================================
    -- BREAKDOWN DE CUSTOS NÃO-TCMP2
    -- ========================================
    costs_not_tcmp2       JSONB NOT NULL DEFAULT '{
        "aluguel": 0,
        "energia": 0,
        "agua": 0,
        "telefone_internet": 0,
        "administrativo": 0,
        "marketing": 0,
        "outros_fixos": 0
    }'::jsonb,

    -- ========================================
    -- BREAKDOWN DE RECEITAS POR TIPO
    -- ========================================
    revenue_breakdown     JSONB NOT NULL DEFAULT '{
        "mecanica": 0,
        "eletrica": 0,
        "funilaria": 0,
        "pintura": 0,
        "ar_condicionado": 0,
        "diagnostico": 0,
        "outros_servicos": 0
    }'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_dremd_updated_at ON dre_monthly_detail;
CREATE TRIGGER trg_dremd_updated_at
    BEFORE UPDATE ON dre_monthly_detail
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE dre_monthly_detail IS 'Detalhe 1:1 do DRE mensal. JSONB pesados: breakdown de custos TCMP2, custos não-TCMP2 e receitas por tipo de serviço. CASCADE no pai.';

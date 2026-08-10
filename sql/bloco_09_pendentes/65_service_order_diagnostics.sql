-- ============================================================================
-- Arquivo: 65_service_order_diagnostics.sql
-- Bloco: Diagnósticos (Tabelas 55 a 68)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Diagnóstico de Ordem de Serviço — análise financeira detalhada
--            de uma OS: custos operacionais, custos com pessoas, pró-labore,
--            peças, serviços, serviços de terceiros, valor hora ideal vs
--            atual, TCMP2, classificação e checklist de conformidade.
--            Normalizado em 3 tabelas:
--              65a. service_order_diagnostics      (core — custos, hora, classificação)
--              65b. service_order_diagnostic_meta   (1:1 — totals, percentages,
--                                                  checklist, recommendations)
--              65c. service_order_diagnostic_items   (peças, serviços, terceiros)
-- Origem Base44: ServiceOrderDiagnostic (20+ campos)
-- Status DBA: Aprovado com melhorias (UNIQUE OS + math integrity)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 65a. DIAGNÓSTICO DE OS — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (Escopo Triplo)
    -- ========================================
    consulting_firm_id    UUID REFERENCES consulting_firms(id) ON DELETE RESTRICT,
    company_id            UUID REFERENCES companies(id) ON DELETE RESTRICT,
    workshop_id           UUID REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- AVALIADOR (SET NULL — fotografia histórica)
    -- ========================================
    evaluator_id          UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- REFERÊNCIA DA OS
    -- ========================================
    os_number             VARCHAR(50) NOT NULL,
    reference_month       VARCHAR(7) NOT NULL,

    -- ========================================
    -- CAPACIDADE PRODUTIVA
    -- ========================================
    productive_technicians INTEGER NOT NULL DEFAULT 0 CHECK (productive_technicians >= 0),
    monthly_hours          NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (monthly_hours >= 0),

    -- ========================================
    -- CUSTOS
    -- ========================================
    operational_costs     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (operational_costs >= 0),
    people_costs          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (people_costs >= 0),
    prolabore             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (prolabore >= 0),

    -- ========================================
    -- VALOR HORA
    -- ========================================
    ideal_hour_value      NUMERIC(14,2) CHECK (ideal_hour_value IS NULL OR ideal_hour_value >= 0),
    current_hour_value    NUMERIC(14,2) CHECK (current_hour_value IS NULL OR current_hour_value >= 0),

    -- ========================================
    -- TCMP2
    -- ========================================
    tcmp2_value           NUMERIC(14,2) CHECK (tcmp2_value IS NULL OR tcmp2_value >= 0),
    tcmp2_percentage      NUMERIC(7,4) CHECK (tcmp2_percentage IS NULL OR tcmp2_percentage >= 0),

    -- ========================================
    -- RESULTADO
    -- ========================================
    classification        VARCHAR(20) CHECK (classification IN (
                            'excelente', 'bom', 'regular',
                            'atencao', 'critico'
                          )),

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
    CONSTRAINT chk_sod_scope_coerencia
        CHECK (
            (consulting_firm_id IS NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (consulting_firm_id IS NOT NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (workshop_id IS NOT NULL)
        ),

    CONSTRAINT chk_sod_reference_month_format
        CHECK (reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),

    CONSTRAINT chk_sod_os_not_empty
        CHECK (LENGTH(TRIM(os_number)) > 0),

    CONSTRAINT chk_sod_completed_coerencia
        CHECK (
            (completed IS TRUE AND classification IS NOT NULL AND completed_at IS NOT NULL)
            OR (completed IS FALSE AND completed_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_sod_workshop       ON service_order_diagnostics(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_evaluator      ON service_order_diagnostics(workshop_id, evaluator_id) WHERE evaluator_id IS NOT NULL AND is_active IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sod_os_month_workshop
    ON service_order_diagnostics (workshop_id, os_number, reference_month)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_sod_os_number      ON service_order_diagnostics(workshop_id, os_number) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_ref_month      ON service_order_diagnostics(workshop_id, reference_month) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_completed      ON service_order_diagnostics(workshop_id, completed) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_sod_classification ON service_order_diagnostics(workshop_id, classification) WHERE completed IS TRUE AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_sod_updated_at ON service_order_diagnostics;
CREATE TRIGGER trg_sod_updated_at
    BEFORE UPDATE ON service_order_diagnostics
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostics IS 'Diag. OS financeiro. Escopo Triplo. Unicidade de OS por oficina/mês. Valor hora ideal vs atual. TCMP2. Completed exige classification + completed_at.';


-- ============================================================================
-- 65b. META DO DIAGNÓSTICO DE OS (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostic_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL UNIQUE REFERENCES service_order_diagnostics(id) ON DELETE CASCADE,

    -- ========================================
    -- TOTAIS E PERCENTUAIS (calculados)
    -- ========================================
    totals                JSONB NOT NULL DEFAULT '{}'::jsonb,
    percentages           JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ========================================
    -- RECOMENDAÇÕES
    -- ========================================
    recommendations       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CHECKLIST DE CONFORMIDADE
    -- ========================================
    checklist             JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_sodm_updated_at ON service_order_diagnostic_meta;
CREATE TRIGGER trg_sodm_updated_at
    BEFORE UPDATE ON service_order_diagnostic_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostic_meta IS 'Meta 1:1 do diag. OS. JSONB pesados: totals, percentages, recommendations[], checklist. CASCADE no pai.';


-- ============================================================================
-- 65c. ITENS DO DIAGNÓSTICO DE OS (peças, serviços, serviços terceiros)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_order_diagnostic_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnostic_id         UUID NOT NULL REFERENCES service_order_diagnostics(id) ON DELETE CASCADE,

    -- ========================================
    -- TIPO DO ITEM
    -- ========================================
    item_type             VARCHAR(20) NOT NULL CHECK (item_type IN (
                            'peca', 'servico', 'servico_terceiro'
                          )),

    -- ========================================
    -- DADOS DO ITEM
    -- ========================================
    description           VARCHAR(500) NOT NULL,
    quantity              NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_value            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
    total_value           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_sodi_description_not_empty
        CHECK (LENGTH(TRIM(description)) > 0),

    CONSTRAINT chk_sodi_math_coerencia
        CHECK (total_value = (quantity * unit_value))
);

CREATE INDEX IF NOT EXISTS idx_sodi_diagnostic   ON service_order_diagnostic_items(diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_sodi_type         ON service_order_diagnostic_items(diagnostic_id, item_type);

DROP TRIGGER IF EXISTS trg_sodi_updated_at ON service_order_diagnostic_items;
CREATE TRIGGER trg_sodi_updated_at
    BEFORE UPDATE ON service_order_diagnostic_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE service_order_diagnostic_items IS 'Itens do diag. OS. quantity > 0, math coercion em total_value. CASCADE no pai.';

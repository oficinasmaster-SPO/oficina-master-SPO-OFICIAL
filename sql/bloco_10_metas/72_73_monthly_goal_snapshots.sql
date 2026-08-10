-- ============================================================================
-- Arquivo: 72_73_monthly_goal_snapshots.sql
-- Bloco: Metas / OKRs (Tabelas 69 a 79)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Snapshot mensal de metas — fotografia consolidada de indicadores
--            financeiros, produtivos e comerciais por oficina ou colaborador.
--            2 tabelas:
--              72. monthly_goal_snapshots      (core — receitas, custos, KPIs)
--              73. monthly_goal_snapshot_meta   (1:1 — marketing, distribuição,
--                                               contagens por canal)
-- Origem Base44: MonthlyGoalHistory (~50 campos)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 72. SNAPSHOT MENSAL DE METAS — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_goal_snapshots (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- ENTIDADE AVALIADA (polimórfica: oficina ou colaborador)
    -- ========================================
    entity_type           VARCHAR(10) NOT NULL CHECK (entity_type IN (
                            'workshop', 'employee'
                          )),
    entity_id             UUID NOT NULL,

    -- ========================================
    -- PERÍODO
    -- ========================================
    month_year            VARCHAR(7) NOT NULL,

    -- ========================================
    -- RECEITAS
    -- ========================================
    revenue_parts         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_parts >= 0),
    revenue_services      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_services >= 0),
    revenue_total         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue_total >= 0),

    -- ========================================
    -- METAS (target)
    -- ========================================
    target_parts          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (target_parts >= 0),
    target_services       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (target_services >= 0),
    target_total          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (target_total >= 0),

    -- ========================================
    -- CUSTOS E PRODUTIVIDADE
    -- ========================================
    productive_technicians INTEGER NOT NULL DEFAULT 0 CHECK (productive_technicians >= 0),
    monthly_hours         NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (monthly_hours >= 0),
    tcmp2                 NUMERIC(14,2) CHECK (tcmp2 IS NULL OR tcmp2 >= 0),
    r70_i30               NUMERIC(7,4) CHECK (r70_i30 IS NULL OR r70_i30 >= 0),

    -- ========================================
    -- INDICADORES COMERCIAIS
    -- ========================================
    pave_commercial       NUMERIC(14,2) CHECK (pave_commercial IS NULL OR pave_commercial >= 0),
    kit_master            NUMERIC(14,2) CHECK (kit_master IS NULL OR kit_master >= 0),
    gps_vendas            NUMERIC(14,2) CHECK (gps_vendas IS NULL OR gps_vendas >= 0),

    -- ========================================
    -- TICKET MÉDIO
    -- ========================================
    ticket_medio_pecas    NUMERIC(14,2) CHECK (ticket_medio_pecas IS NULL OR ticket_medio_pecas >= 0),
    ticket_medio_servicos NUMERIC(14,2) CHECK (ticket_medio_servicos IS NULL OR ticket_medio_servicos >= 0),
    ticket_medio_geral    NUMERIC(14,2) CHECK (ticket_medio_geral IS NULL OR ticket_medio_geral >= 0),

    -- ========================================
    -- VOLUME DE CLIENTES
    -- ========================================
    total_clients         INTEGER NOT NULL DEFAULT 0 CHECK (total_clients >= 0),
    new_clients           INTEGER NOT NULL DEFAULT 0 CHECK (new_clients >= 0),
    returning_clients     INTEGER NOT NULL DEFAULT 0 CHECK (returning_clients >= 0),

    -- ========================================
    -- RENTABILIDADE
    -- ========================================
    profitability_pct     NUMERIC(7,4) CHECK (profitability_pct IS NULL OR profitability_pct >= 0),
    gross_profit          NUMERIC(14,2) CHECK (gross_profit IS NULL OR gross_profit >= 0),
    net_profit            NUMERIC(14,2),

    -- ========================================
    -- STATUS SEMAFÓRICO
    -- ========================================
    status                VARCHAR(10) NOT NULL DEFAULT 'yellow' CHECK (status IN (
                            'red', 'yellow', 'green'
                          )),

    -- ========================================
    -- CONTROLE (imutável — snapshot mensal)
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_mgs_month_format
        CHECK (month_year ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mgs_entity_month
    ON monthly_goal_snapshots (workshop_id, entity_type, entity_id, month_year)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_mgs_workshop        ON monthly_goal_snapshots(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_mgs_entity          ON monthly_goal_snapshots(workshop_id, entity_type, entity_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_mgs_status          ON monthly_goal_snapshots(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_mgs_month           ON monthly_goal_snapshots(workshop_id, month_year) WHERE is_active IS TRUE;

COMMENT ON TABLE monthly_goal_snapshots IS 'Snapshot mensal de metas. Polimórfica: workshop ou employee. Receitas, custos, KPIs, ticket médio, volume de clientes, rentabilidade. UNIQUE por entidade+mês. Imutável (sem updated_at).';


-- ============================================================================
-- 73. META DO SNAPSHOT MENSAL (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_goal_snapshot_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id           UUID NOT NULL UNIQUE REFERENCES monthly_goal_snapshots(id) ON DELETE CASCADE,

    -- ========================================
    -- MARKETING E DISTRIBUIÇÃO
    -- ========================================
    marketing_data        JSONB NOT NULL DEFAULT '{
        "investimento": 0,
        "leads_gerados": 0,
        "conversao_leads": 0,
        "custo_por_lead": 0,
        "canais": {}
    }'::jsonb,

    revenue_distribution  JSONB NOT NULL DEFAULT '{
        "pecas_pct": 0,
        "servicos_pct": 0,
        "terceiros_pct": 0,
        "garantia_pct": 0
    }'::jsonb,

    -- ========================================
    -- CONTAGENS POR CANAL
    -- ========================================
    clients_by_channel    JSONB NOT NULL DEFAULT '{
        "espontaneo": 0,
        "indicacao": 0,
        "seguro": 0,
        "frota": 0,
        "marketing": 0,
        "retorno": 0
    }'::jsonb,

    -- ========================================
    -- OBSERVAÇÕES E IA
    -- ========================================
    observations          TEXT,
    ai_analysis           JSONB NOT NULL DEFAULT '{
        "summary": null,
        "trends": [],
        "alerts": [],
        "recommendations": []
    }'::jsonb,

    -- ========================================
    -- CONTROLE (imutável — snapshot)
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE monthly_goal_snapshot_meta IS 'Meta 1:1 do snapshot mensal. JSONB pesados: marketing_data, revenue_distribution, clients_by_channel, ai_analysis. CASCADE no pai. Imutável.';

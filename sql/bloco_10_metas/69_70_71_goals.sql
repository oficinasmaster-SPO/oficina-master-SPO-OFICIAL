-- ============================================================================
-- Arquivo: 69_70_71_goals.sql
-- Bloco: Metas / OKRs (Tabelas 69 a 79)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Metas de oficina por área/período, metas por área consolidada
--            e histórico de atingimento (timeline imutável).
--            3 tabelas:
--              69. goals             (metas com métricas JSONB)
--              70. area_goals        (metas consolidadas por área)
--              71. goal_history      (histórico de atingimento — imutável)
-- Origem Base44: Goal, AreaGoal, GoalHistory
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 69. METAS DA OFICINA
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PERÍODO E ÁREA
    -- ========================================
    periodo               VARCHAR(10) NOT NULL CHECK (periodo IN (
                            'diario', 'semanal', 'mensal', 'anual'
                          )),
    data_inicio           DATE NOT NULL,
    data_fim              DATE NOT NULL,
    area                  VARCHAR(15) NOT NULL CHECK (area IN (
                            'vendas', 'comercial', 'marketing', 'tecnico',
                            'pateo', 'financeiro', 'lideranca', 'geral'
                          )),

    -- ========================================
    -- RESPONSÁVEL (SET NULL — fotografia histórica)
    -- ========================================
    responsavel_id        UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- ========================================
    -- MÉTRICAS (7 pares meta/realizado — estrutura fixa)
    -- ========================================
    metricas              JSONB NOT NULL DEFAULT '{
        "volume_clientes":      {"meta": 0, "realizado": 0},
        "faturamento_pecas":    {"meta": 0, "realizado": 0},
        "faturamento_servicos": {"meta": 0, "realizado": 0},
        "rentabilidade":        {"meta": 0, "realizado": 0},
        "lucro":                {"meta": 0, "realizado": 0},
        "ticket_medio_pecas":   {"meta": 0, "realizado": 0},
        "ticket_medio_servicos":{"meta": 0, "realizado": 0}
    }'::jsonb,

    -- ========================================
    -- RESULTADO
    -- ========================================
    percentual_atingido   NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (percentual_atingido >= 0),
    status                VARCHAR(12) NOT NULL DEFAULT 'ativa' CHECK (status IN (
                            'ativa', 'concluida', 'cancelada'
                          )),
    observacoes           TEXT,

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
    CONSTRAINT chk_goals_period_coerencia
        CHECK (data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_goals_workshop     ON goals(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_area         ON goals(workshop_id, area) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_periodo      ON goals(workshop_id, periodo) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_status       ON goals(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_responsavel  ON goals(workshop_id, responsavel_id) WHERE responsavel_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_dates        ON goals(workshop_id, data_inicio, data_fim) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_goals_updated_at ON goals;
CREATE TRIGGER trg_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE goals IS 'Metas da oficina por área e período. Métricas JSONB com 7 pares meta/realizado. data_fim >= data_inicio. Responsável SET NULL (fotografia histórica).';


-- ============================================================================
-- 70. METAS POR ÁREA (consolidadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS area_goals (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- ÁREA E PERÍODO
    -- ========================================
    area                  VARCHAR(15) NOT NULL CHECK (area IN (
                            'vendas', 'comercial', 'tecnico',
                            'financeiro', 'marketing', 'pessoas'
                          )),
    period                VARCHAR(7) NOT NULL,
    metric_type           VARCHAR(50),

    -- ========================================
    -- VALORES
    -- ========================================
    goal_value            NUMERIC(14,2) NOT NULL CHECK (goal_value >= 0),
    current_value         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    achievement_percentage NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (achievement_percentage >= 0),

    -- ========================================
    -- STATUS
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'em_progresso' CHECK (status IN (
                            'atingida', 'em_progresso', 'em_alerta', 'critica'
                          )),

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
    CONSTRAINT chk_ag_period_format
        CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ag_workshop_area_period
    ON area_goals (workshop_id, area, period)
    WHERE is_active IS TRUE;

CREATE INDEX IF NOT EXISTS idx_ag_workshop        ON area_goals(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_ag_status          ON area_goals(workshop_id, status) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_ag_updated_at ON area_goals;
CREATE TRIGGER trg_ag_updated_at
    BEFORE UPDATE ON area_goals
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE area_goals IS 'Meta consolidada por área e mês. UNIQUE (workshop_id, area, period) com soft delete. Status semafórico: atingida/em_progresso/em_alerta/critica.';


-- ============================================================================
-- 71. HISTÓRICO DE ATINGIMENTO DE METAS (timeline imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (inferido do entity)
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
    -- VALORES
    -- ========================================
    goal_established      NUMERIC(14,2) NOT NULL CHECK (goal_established >= 0),
    result_achieved       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (result_achieved >= 0),
    percentage_achieved   NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (percentage_achieved >= 0),

    -- ========================================
    -- STATUS SEMAFÓRICO
    -- ========================================
    status                VARCHAR(10) NOT NULL CHECK (status IN (
                            'red', 'yellow', 'green'
                          )),

    -- ========================================
    -- DADOS DETALHADOS E IA
    -- ========================================
    detailed_data         JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_insights           JSONB NOT NULL DEFAULT '{
        "summary": null,
        "risks": [],
        "opportunities": [],
        "suggestions": [],
        "forecast": null
    }'::jsonb,

    -- ========================================
    -- CONTROLE (imutável — sem updated_at)
    -- ========================================
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_gh_month_format
        CHECK (month_year ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gh_entity_month
    ON goal_history (workshop_id, entity_type, entity_id, month_year);

CREATE INDEX IF NOT EXISTS idx_gh_workshop        ON goal_history(workshop_id);
CREATE INDEX IF NOT EXISTS idx_gh_entity          ON goal_history(workshop_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gh_status          ON goal_history(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_gh_month           ON goal_history(workshop_id, month_year);

COMMENT ON TABLE goal_history IS 'Timeline imutável de atingimento de metas. Polimórfica: workshop ou employee. Status semafórico red/yellow/green. UNIQUE por entidade+mês. ai_insights JSONB com resumo, riscos e sugestões.';

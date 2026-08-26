-- ============================================================================
-- Arquivo: 93_94_95_tasks.sql
-- Bloco: Tasks / Backlog (Tabelas 93 a 102)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Tarefas operacionais da oficina — QGP, serviços, geral.
--            3 tabelas:
--              93. tasks             (core — Escopo Triplo, status, prioridade)
--              94. task_meta         (1:1 — QGP data, IA, recorrência, anexos)
--              95. task_time_entries  (registros de tempo trabalhado)
-- Origem Base44: Task (~40 campos)
--
-- CONFORMIDADE:
--   ✓ Escopo Triplo (consulting_firm_id, company_id, workshop_id)
--   ✓ chk_scope_coerencia — NULL/NULL/NULL OR cf OR ws
--   ✓ Cinturão Multi-Tenant — todos indexes com workshop_id
--   ✓ Fotografia Histórica — employee_id SET NULL
--   ✓ Core+Meta split — TOAST performance
--   ✓ Mão dupla — completed exige completed_date
--   ✓ NUMERIC(7,4) percentual, INTEGER minutos
--   ✓ trigger_set_timestamp() com EXECUTE FUNCTION
--   ✓ Não conflita com consulting_sprint_tasks (Bloco 07)
--     nem implementation_tracking (Bloco 06) — escopos distintos
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 93. TAREFAS OPERACIONAIS — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (Escopo Triplo)
    -- ========================================
    consulting_firm_id    UUID REFERENCES consulting_firms(id) ON DELETE RESTRICT,
    company_id            UUID REFERENCES companies(id) ON DELETE RESTRICT,
    workshop_id           UUID REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- RESPONSÁVEL TÉCNICO (SET NULL — fotografia)
    -- ========================================
    employee_id           UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- ========================================
    -- DADOS DA TAREFA
    -- ========================================
    title                 VARCHAR(500) NOT NULL,
    description           TEXT,
    task_type             VARCHAR(25) NOT NULL DEFAULT 'geral' CHECK (task_type IN (
                            'geral', 'qgp_solicitacao_servico',
                            'qgp_aviso_entrega', 'qgp_tcmp2',
                            'qgp_retrabalho', 'qgp_aguardando'
                          )),

    -- ========================================
    -- STATUS E PRIORIDADE
    -- ========================================
    status                VARCHAR(15) NOT NULL DEFAULT 'pendente' CHECK (status IN (
                            'pendente', 'em_andamento', 'pausada',
                            'concluida', 'cancelada'
                          )),
    priority              VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (priority IN (
                            'baixa', 'media', 'alta', 'urgente'
                          )),
    assigned_team         VARCHAR(15) CHECK (assigned_team IN (
                            'vendas', 'comercial', 'marketing', 'tecnico',
                            'administrativo', 'financeiro', 'gerencia'
                          )),

    -- ========================================
    -- DATAS
    -- ========================================
    due_date              TIMESTAMPTZ,
    completed_date        TIMESTAMPTZ,

    -- ========================================
    -- PROGRESSO E TEMPO
    -- ========================================
    progress              SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    predicted_time_minutes INTEGER NOT NULL DEFAULT 0 CHECK (predicted_time_minutes >= 0),
    actual_time_minutes   INTEGER NOT NULL DEFAULT 0 CHECK (actual_time_minutes >= 0),
    is_overdue            BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- RECORRÊNCIA
    -- ========================================
    is_recurring          BOOLEAN NOT NULL DEFAULT FALSE,
    parent_task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,

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
    CONSTRAINT chk_task_scope_coerencia
        CHECK (
            (consulting_firm_id IS NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (consulting_firm_id IS NOT NULL AND company_id IS NULL AND workshop_id IS NULL)
            OR (workshop_id IS NOT NULL)
        ),

    CONSTRAINT chk_task_completed_coerencia
        CHECK (
            (status = 'concluida' AND completed_date IS NOT NULL)
            OR (status <> 'concluida')
        ),

    CONSTRAINT chk_task_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_task_workshop       ON tasks(workshop_id) WHERE workshop_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_status         ON tasks(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_priority       ON tasks(workshop_id, priority) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_type           ON tasks(workshop_id, task_type) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_team           ON tasks(workshop_id, assigned_team) WHERE assigned_team IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_employee       ON tasks(workshop_id, employee_id) WHERE employee_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_due_date       ON tasks(workshop_id, due_date) WHERE due_date IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_overdue        ON tasks(workshop_id, is_overdue) WHERE is_overdue IS TRUE AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_task_parent         ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_cf             ON tasks(consulting_firm_id) WHERE consulting_firm_id IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_task_updated_at ON tasks;
CREATE TRIGGER trg_task_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE tasks IS 'Tarefas operacionais. Escopo Triplo. QGP types. Mão dupla: concluida exige completed_date. Self-ref parent_task_id para recorrência. Não conflita com consulting_sprint_tasks (Bloco 07).';


-- ============================================================================
-- 94. META DA TAREFA (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id               UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,

    -- ========================================
    -- ATRIBUIÇÃO E TAGS
    -- ========================================
    assigned_to_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies          JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- ANEXOS
    -- ========================================
    attachments           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- RECORRÊNCIA (detalhes)
    -- ========================================
    recurrence_pattern    VARCHAR(15) CHECK (recurrence_pattern IN (
                            'diariamente', 'semanalmente',
                            'quinzenalmente', 'mensalmente', 'personalizado'
                          )),
    recurrence_days       JSONB,
    recurrence_end_date   DATE,

    -- ========================================
    -- LEMBRETES
    -- ========================================
    reminder_settings     JSONB NOT NULL DEFAULT '{
        "enabled": true,
        "email_reminder": true,
        "app_notification": true,
        "reminder_before": []
    }'::jsonb,

    -- ========================================
    -- DADOS QGP (Quadro de Gestão de Produção)
    -- ========================================
    qgp_data              JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ========================================
    -- IA
    -- ========================================
    ai_data               JSONB NOT NULL DEFAULT '{
        "epi": null,
        "specificity": null,
        "steps": [],
        "success_indicator": null
    }'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_taskm_updated_at ON task_meta;
CREATE TRIGGER trg_taskm_updated_at
    BEFORE UPDATE ON task_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE task_meta IS 'Meta 1:1 da tarefa. JSONB: assigned_to[], tags[], dependencies[], attachments[], qgp_data{}, ai_data{}, reminder_settings. CASCADE no pai.';


-- ============================================================================
-- 95. REGISTROS DE TEMPO TRABALHADO (normalizado de Task.time_tracking[])
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_time_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    task_id               UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- ========================================
    -- PERÍODO
    -- ========================================
    start_time            TIMESTAMPTZ NOT NULL,
    end_time              TIMESTAMPTZ,
    duration_minutes      INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),

    -- ========================================
    -- OBSERVAÇÕES
    -- ========================================
    notes                 TEXT,

    -- ========================================
    -- CONTROLE (imutável — registro de ponto)
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_tte_end_after_start
        CHECK (end_time IS NULL OR end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_tte_task            ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_tte_user            ON task_time_entries(user_id);

COMMENT ON TABLE task_time_entries IS 'Time tracking normalizado. Imutável. end_time >= start_time. CASCADE na tarefa pai. Origem: Task.time_tracking[] do Base44.';

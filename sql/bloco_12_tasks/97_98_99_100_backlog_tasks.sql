-- ============================================================================
-- Arquivo: 97_98_99_100_backlog_tasks.sql
-- Bloco: Tasks / Backlog (Tabelas 93 a 102)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Backlog de tarefas de consultoria — rastreabilidade de origem,
--            estados de espera, checklist, histórico de auditoria.
--            4 tabelas:
--              97. backlog_tasks           (core — origem, status, tempo)
--              98. backlog_task_meta       (1:1 — notificações, mídia, espera)
--              99. backlog_task_history    (auditoria — imutável)
--             100. backlog_checklist_items (itens de checklist)
-- Origem Base44: TarefaBacklog (~40 campos), TarefaBacklogHistorico,
--                BacklogChecklistItem
--
-- CONFORMIDADE:
--   ✓ Cinturão Multi-Tenant — workshop_id NOT NULL em todas, indexes prefixados
--   ✓ Core+Meta split — campos de notificação consolidados em JSONB
--   ✓ Fotografia: assignee_id, requester_id, assigned_to_id → SET NULL
--   ✓ Mão dupla: bloqueada exige motivo_bloqueio; concluida exige data_conclusao
--   ✓ Imutável: backlog_task_history sem updated_at nem trigger
--   ✓ NUMERIC(5,2) para horas estimadas/reais
--   ✓ Não conflita com implementation_tracking (Bloco 06) — escopo distinto
--   ✓ Não conflita com tasks (Bloco 12 #93) — backlog é consultoria, tasks é operacional
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 97. BACKLOG DE TAREFAS — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS backlog_tasks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- PESSOAS (SET NULL — fotografia histórica)
    -- ========================================
    assignee_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    requester_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_id        UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- DADOS DA TAREFA
    -- ========================================
    titulo                VARCHAR(500) NOT NULL,
    descricao             TEXT,

    -- ========================================
    -- RASTREABILIDADE DE ORIGEM
    -- ========================================
    origin_type           VARCHAR(15) NOT NULL CHECK (origin_type IN (
                            'reuniao', 'contrato', 'pedido', 'diagnostico',
                            'manual', 'followup', 'cronograma',
                            'consultoria', 'automacao', 'projeto'
                          )),
    origin_id             UUID,
    origin_date           TIMESTAMPTZ,

    -- ========================================
    -- PRAZO E PRIORIDADE
    -- ========================================
    prazo                 DATE NOT NULL,
    prioridade            VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridade IN (
                            'baixa', 'media', 'alta', 'critica'
                          )),

    -- ========================================
    -- STATUS
    -- ========================================
    status                VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN (
                            'aberta', 'em_execucao', 'aguardando_cliente',
                            'bloqueada', 'concluida'
                          )),
    impacto               VARCHAR(15) CHECK (impacto IN (
                            'financeiro', 'entrega', 'satisfacao', 'multiplo'
                          )),
    motivo_bloqueio       TEXT,

    -- ========================================
    -- DATAS
    -- ========================================
    data_atribuicao       TIMESTAMPTZ,
    data_conclusao        TIMESTAMPTZ,

    -- ========================================
    -- TEMPO (horas)
    -- ========================================
    tempo_estimado_horas  NUMERIC(5,2) NOT NULL CHECK (tempo_estimado_horas >= 0),
    tempo_real_horas      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tempo_real_horas >= 0),

    -- ========================================
    -- CHECKLIST (cache denormalizado)
    -- ========================================
    checklist_total       INTEGER NOT NULL DEFAULT 0 CHECK (checklist_total >= 0),
    checklist_concluidos  INTEGER NOT NULL DEFAULT 0 CHECK (checklist_concluidos >= 0),

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_bt_titulo_not_empty
        CHECK (LENGTH(TRIM(titulo)) > 0),

    CONSTRAINT chk_bt_concluida_coerencia
        CHECK (
            (status = 'concluida' AND data_conclusao IS NOT NULL)
            OR (status <> 'concluida')
        ),

    CONSTRAINT chk_bt_bloqueada_coerencia
        CHECK (
            (status = 'bloqueada' AND motivo_bloqueio IS NOT NULL)
            OR (status <> 'bloqueada')
        ),

    CONSTRAINT chk_bt_checklist_coerencia
        CHECK (checklist_concluidos <= checklist_total)
);

CREATE INDEX IF NOT EXISTS idx_bt_workshop         ON backlog_tasks(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_status           ON backlog_tasks(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_prioridade       ON backlog_tasks(workshop_id, prioridade) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_assignee         ON backlog_tasks(workshop_id, assignee_id) WHERE assignee_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_assigned_to      ON backlog_tasks(workshop_id, assigned_to_id) WHERE assigned_to_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_requester        ON backlog_tasks(workshop_id, requester_id) WHERE requester_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_prazo            ON backlog_tasks(workshop_id, prazo) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_bt_origin           ON backlog_tasks(workshop_id, origin_type) WHERE is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_bt_updated_at ON backlog_tasks;
CREATE TRIGGER trg_bt_updated_at
    BEFORE UPDATE ON backlog_tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE backlog_tasks IS 'Backlog de consultoria. 10 origens rastreáveis. Mão dupla: concluida exige data_conclusao, bloqueada exige motivo. Cache checklist denormalizado. Fotografia em 4 user refs.';


-- ============================================================================
-- 98. META DO BACKLOG (1:1 — JSONB pesados, notificações)
-- ============================================================================
CREATE TABLE IF NOT EXISTS backlog_task_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id               UUID NOT NULL UNIQUE REFERENCES backlog_tasks(id) ON DELETE CASCADE,

    -- ========================================
    -- CACHE DE ORIGEM
    -- ========================================
    workshop_nome         VARCHAR(300),
    assignee_name         VARCHAR(200),
    origin_title          VARCHAR(500),

    -- ========================================
    -- ESPERA DO CLIENTE
    -- ========================================
    aguardando_cliente    BOOLEAN NOT NULL DEFAULT FALSE,
    aguardando_cliente_desde TIMESTAMPTZ,
    aguardando_cliente_motivo TEXT,
    usuario_aguardo_id    UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- MÍDIAS ANEXAS
    -- ========================================
    midias_anexas         JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- NOTAS
    -- ========================================
    notas                 TEXT,

    -- ========================================
    -- NOTIFICAÇÕES (consolidado em JSONB — 7 flags + timestamp)
    -- ========================================
    notification_state    JSONB NOT NULL DEFAULT '{
        "criacao_enviada": false,
        "atribuicao_enviada": false,
        "status_enviada": false,
        "bloqueio_enviada": false,
        "conclusao_enviada": false,
        "prazo_proximo_enviada": false,
        "vencimento_enviada": false,
        "ultima_status_em": null
    }'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_btm_updated_at ON backlog_task_meta;
CREATE TRIGGER trg_btm_updated_at
    BEFORE UPDATE ON backlog_task_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE backlog_task_meta IS 'Meta 1:1 do backlog. Caches de nome, estado de espera do cliente, midias JSONB, 7 flags de notificação consolidados em notification_state JSONB. CASCADE no pai.';


-- ============================================================================
-- 99. HISTÓRICO DO BACKLOG (timeline imutável)
-- ============================================================================
CREATE TABLE IF NOT EXISTS backlog_task_history (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIA
    -- ========================================
    tarefa_id             UUID NOT NULL REFERENCES backlog_tasks(id) ON DELETE CASCADE,

    -- ========================================
    -- AÇÃO
    -- ========================================
    usuario_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    usuario_nome          VARCHAR(200),
    acao                  VARCHAR(15) NOT NULL CHECK (acao IN (
                            'CRIACAO', 'ATRIBUICAO', 'MUDANCA_STATUS',
                            'EDICAO', 'CONCLUSAO', 'BLOQUEIO'
                          )),

    -- ========================================
    -- ALTERAÇÃO
    -- ========================================
    campo                 VARCHAR(100),
    valor_anterior        TEXT,
    valor_novo            TEXT,

    -- ========================================
    -- CONTROLE (imutável — sem updated_at)
    -- ========================================
    data_hora             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bth_tarefa          ON backlog_task_history(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_bth_acao            ON backlog_task_history(tarefa_id, acao);
CREATE INDEX IF NOT EXISTS idx_bth_usuario         ON backlog_task_history(usuario_id) WHERE usuario_id IS NOT NULL;

COMMENT ON TABLE backlog_task_history IS 'Auditoria imutável do backlog. 6 tipos de ação. Sem updated_at. CASCADE no pai. usuario SET NULL (fotografia).';


-- ============================================================================
-- 100. ITENS DE CHECKLIST DO BACKLOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS backlog_checklist_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    task_id               UUID NOT NULL REFERENCES backlog_tasks(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- DADOS DO ITEM
    -- ========================================
    titulo                VARCHAR(500) NOT NULL,
    descricao             TEXT,
    ordem                 INTEGER NOT NULL DEFAULT 0,

    -- ========================================
    -- CONCLUSÃO (SET NULL — fotografia)
    -- ========================================
    concluido             BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by          UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_bci_titulo_not_empty
        CHECK (LENGTH(TRIM(titulo)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_bci_task            ON backlog_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_bci_workshop        ON backlog_checklist_items(workshop_id);

DROP TRIGGER IF EXISTS trg_bci_updated_at ON backlog_checklist_items;
CREATE TRIGGER trg_bci_updated_at
    BEFORE UPDATE ON backlog_checklist_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE backlog_checklist_items IS 'Checklist do backlog. CASCADE na tarefa pai. completed_by SET NULL (fotografia). Não conflita com checklist_templates (Bloco 06) — aquele é template, este é instância.';

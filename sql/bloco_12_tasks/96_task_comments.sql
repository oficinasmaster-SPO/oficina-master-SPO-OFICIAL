-- ============================================================================
-- Arquivo: 96_task_comments.sql
-- Bloco: Tasks / Backlog (Tabelas 93 a 102)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Comentários polimórficos em tarefas e entidades — threaded,
--            com anexos e notas internas.
--            1 tabela:
--              96. task_comments  (comentários com respostas encadeadas)
-- Origem Base44: TaskComment
--
-- CONFORMIDADE:
--   ✓ Cinturão Multi-Tenant — workshop_id NOT NULL, todos indexes prefixados
--   ✓ Polimórfico via entity_type + entity_id (mesmo padrão de goal_history)
--   ✓ Self-reference para threading (parent_comment_id SET NULL)
--   ✓ Fotografia: author_id SET NULL, author_name cache
--   ✓ Mão dupla: is_edited TRUE exige edited_at NOT NULL
--   ✓ Attachments como JSONB array (mesmo padrão task_meta)
--   ✓ Não conflita com consulting_sprint_review_history (Bloco 07)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 96. COMENTÁRIOS POLIMÓRFICOS EM TAREFAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_comments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT
    -- ========================================
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- ENTIDADE COMENTADA (polimórfica)
    -- ========================================
    entity_type           VARCHAR(20) NOT NULL CHECK (entity_type IN (
                            'task', 'tarefa_backlog', 'pedido_interno'
                          )),
    entity_id             UUID NOT NULL,

    -- ========================================
    -- AUTOR (SET NULL — fotografia + cache)
    -- ========================================
    author_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name           VARCHAR(200),

    -- ========================================
    -- CONTEÚDO
    -- ========================================
    content               TEXT NOT NULL,
    attachments           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- THREADING (respostas encadeadas)
    -- ========================================
    parent_comment_id     UUID REFERENCES task_comments(id) ON DELETE SET NULL,

    -- ========================================
    -- VISIBILIDADE
    -- ========================================
    is_internal           BOOLEAN NOT NULL DEFAULT FALSE,

    -- ========================================
    -- EDIÇÃO
    -- ========================================
    is_edited             BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at             TIMESTAMPTZ,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_tc_content_not_empty
        CHECK (LENGTH(TRIM(content)) > 0),

    CONSTRAINT chk_tc_edited_coerencia
        CHECK (
            (is_edited IS TRUE AND edited_at IS NOT NULL)
            OR (is_edited IS FALSE AND edited_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_tc_workshop         ON task_comments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_tc_entity           ON task_comments(workshop_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tc_author           ON task_comments(workshop_id, author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tc_parent           ON task_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_tc_comment_updated_at ON task_comments;
CREATE TRIGGER trg_tc_comment_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE task_comments IS 'Comentários polimórficos: task/tarefa_backlog/pedido_interno. Threading via parent_comment_id. Mão dupla: is_edited exige edited_at. Anexos JSONB. is_internal para notas internas.';

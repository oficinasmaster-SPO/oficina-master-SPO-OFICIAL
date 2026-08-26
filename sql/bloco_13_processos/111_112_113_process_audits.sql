-- ============================================================================
-- Arquivo: 111_112_113_process_audits.sql
-- Bloco: Processos / Qualidade (Tabelas 103 a 113)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Auditorias de processo e compartilhamento de documentos.
--            3 tabelas:
--              111. process_audits      (core — auditor, tipo, nota)
--              112. process_audit_meta  (1:1 — conformity, 5W2H, NC JSONB)
--              113. process_shares      (compartilhamento de MAP/IT)
-- Origem Base44: ProcessAudit (~15 campos), ProcessShare (~7 campos)
--
-- CONFORMIDADE:
--   ✓ Cinturão Multi-Tenant — workshop_id NOT NULL, indexes prefixados
--   ✓ FK process_documents(id) — CASCADE em audits, CASCADE em shares
--   ✓ Core+Meta split — conformity_checklist/non_conformities/action_plan pesados
--   ✓ Fotografia: auditor_id SET NULL, shared_by SET NULL
--   ✓ overall_score NUMERIC(7,4) 0-100
--   ✓ process_shares com expires_at e permission_level
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 111. AUDITORIAS DE PROCESSO — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_audits (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    process_id            UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- AUDITOR (SET NULL — fotografia)
    -- ========================================
    auditor_id            UUID REFERENCES users(id) ON DELETE SET NULL,
    auditor_name          VARCHAR(200),

    -- ========================================
    -- DADOS DA AUDITORIA
    -- ========================================
    audit_date            DATE NOT NULL,
    audit_type            VARCHAR(15) NOT NULL DEFAULT 'interna' CHECK (audit_type IN (
                            'interna', 'externa', 'consultoria', 'certificacao'
                          )),

    -- ========================================
    -- RESULTADO
    -- ========================================
    overall_score         NUMERIC(7,4) CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
    next_audit_date       DATE,

    -- ========================================
    -- CONTROLE
    -- ========================================
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paud_workshop       ON process_audits(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_paud_process        ON process_audits(workshop_id, process_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_paud_type           ON process_audits(workshop_id, audit_type) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_paud_date           ON process_audits(workshop_id, audit_date) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_paud_auditor        ON process_audits(workshop_id, auditor_id) WHERE auditor_id IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_paud_updated_at ON process_audits;
CREATE TRIGGER trg_paud_updated_at
    BEFORE UPDATE ON process_audits
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_audits IS 'Auditorias de processo. FK process_documents CASCADE. 4 tipos. overall_score 0-100. auditor SET NULL (fotografia). next_audit_date para agendamento.';


-- ============================================================================
-- 112. META DA AUDITORIA (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_audit_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id              UUID NOT NULL UNIQUE REFERENCES process_audits(id) ON DELETE CASCADE,

    -- ========================================
    -- CHECKLIST DE CONFORMIDADE
    -- ========================================
    conformity_checklist  JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- NÃO CONFORMIDADES
    -- ========================================
    non_conformities      JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- PLANO DE AÇÃO 5W2H
    -- ========================================
    action_plan           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- RECOMENDAÇÕES E ANEXOS
    -- ========================================
    recommendations       TEXT,
    attachments           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_paudm_updated_at ON process_audit_meta;
CREATE TRIGGER trg_paudm_updated_at
    BEFORE UPDATE ON process_audit_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_audit_meta IS 'Meta 1:1 da auditoria. JSONB: conformity_checklist[] (item+status+evidência), non_conformities[] (severidade+causa raiz+ação corretiva), action_plan[] (5W2H). CASCADE no pai.';


-- ============================================================================
-- 113. COMPARTILHAMENTO DE DOCUMENTOS DE PROCESSO
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_shares (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    process_document_id   UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- COMPARTILHAMENTO
    -- ========================================
    shared_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    shared_with_email     VARCHAR(320) NOT NULL,
    message               TEXT,

    -- ========================================
    -- PERMISSÃO
    -- ========================================
    permission_level      VARCHAR(6) NOT NULL DEFAULT 'view' CHECK (permission_level IN (
                            'view', 'edit', 'admin'
                          )),

    -- ========================================
    -- EXPIRAÇÃO
    -- ========================================
    expires_at            TIMESTAMPTZ,

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================
    -- CONSTRAINTS
    -- ========================================
    CONSTRAINT chk_ps_email_not_empty
        CHECK (LENGTH(TRIM(shared_with_email)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ps_doc_email
    ON process_shares (process_document_id, shared_with_email)
    WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_ps_workshop         ON process_shares(workshop_id);
CREATE INDEX IF NOT EXISTS idx_ps_document         ON process_shares(process_document_id);
CREATE INDEX IF NOT EXISTS idx_ps_shared_with      ON process_shares(shared_with_email);

COMMENT ON TABLE process_shares IS 'Compartilhamento de MAP/IT. UNIQUE (doc+email) para shares ativos. permission_level view/edit/admin. expires_at opcional. shared_by SET NULL.';

-- ============================================================================
-- Arquivo: 104_105_106_process_documents.sql
-- Bloco: Processos / Qualidade (Tabelas 103 a 113)
-- Origem: Migração Base44 → Oficina Master SPO
-- Descrição: Documentos de processo (MAP/IT) e implementações.
--            3 tabelas:
--              104. process_documents         (core — título, código, status)
--              105. process_document_meta     (1:1 — content_json, versioning)
--              106. process_implementations   (deploy do MAP com evidências)
-- Origem Base44: ProcessDocument (~25 campos), ProcessImplementation (~12 campos)
--
-- CONFORMIDADE:
--   ✓ FK process_areas(id) — SET NULL (área pode ser reorganizada)
--   ✓ Core+Meta split — content_json pesado em TOAST separado
--   ✓ workshop_id NULL = template global (is_template)
--   ✓ Cinturão Multi-Tenant — todos indexes prefixados
--   ✓ Mão dupla: concluida exige completion_date
--   ✓ NÃO conflita com implementation_tracking (Bloco 06):
--     Bloco 06 = cronograma geral de implementação de projetos
--     Bloco 13 = deploy de documento MAP/IT com checklist de conformidade
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 104. DOCUMENTOS DE PROCESSO (MAP/IT) — CORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_documents (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- MULTI-TENANT (NULL = template global)
    -- ========================================
    workshop_id           UUID REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- ÁREA (SET NULL — reorganização)
    -- ========================================
    area_id               UUID REFERENCES process_areas(id) ON DELETE SET NULL,

    -- ========================================
    -- IDENTIFICAÇÃO
    -- ========================================
    title                 VARCHAR(500) NOT NULL,
    code                  VARCHAR(50),
    revision              VARCHAR(10) NOT NULL DEFAULT '1',
    description           TEXT,

    -- ========================================
    -- CLASSIFICAÇÃO
    -- ========================================
    subcategory           VARCHAR(200),
    is_template           BOOLEAN NOT NULL DEFAULT TRUE,

    -- ========================================
    -- STATUS OPERACIONAL
    -- ========================================
    operational_status    VARCHAR(25) NOT NULL DEFAULT 'em_elaboracao' CHECK (operational_status IN (
                            'em_elaboracao', 'em_implementacao',
                            'em_auditoria', 'em_melhoria_continua', 'operacional'
                          )),
    status                VARCHAR(12) NOT NULL DEFAULT 'ativo' CHECK (status IN (
                            'ativo', 'obsoleto', 'em_revisao'
                          )),

    -- ========================================
    -- ARQUIVO PDF
    -- ========================================
    pdf_url               VARCHAR(500),

    -- ========================================
    -- AUDITORIA
    -- ========================================
    last_audit_date       DATE,
    next_audit_date       DATE,

    -- ========================================
    -- CONTADORES (cache denormalizado)
    -- ========================================
    indicators_count      INTEGER NOT NULL DEFAULT 0 CHECK (indicators_count >= 0),
    child_its_count       INTEGER NOT NULL DEFAULT 0 CHECK (child_its_count >= 0),

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
    CONSTRAINT chk_pd_title_not_empty
        CHECK (LENGTH(TRIM(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pd_workshop         ON process_documents(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pd_area             ON process_documents(area_id) WHERE area_id IS NOT NULL AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pd_op_status        ON process_documents(workshop_id, operational_status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pd_status           ON process_documents(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pd_template         ON process_documents(is_template) WHERE is_template IS TRUE AND is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pd_code             ON process_documents(workshop_id, code) WHERE code IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_pd_updated_at ON process_documents;
CREATE TRIGGER trg_pd_updated_at
    BEFORE UPDATE ON process_documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_documents IS 'Documentos MAP/IT. workshop_id NULL = template global. FK process_areas SET NULL. 5 status operacionais. Contadores denormalizados.';


-- ============================================================================
-- 105. META DO DOCUMENTO DE PROCESSO (1:1 — JSONB pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_document_meta (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id           UUID NOT NULL UNIQUE REFERENCES process_documents(id) ON DELETE CASCADE,

    -- ========================================
    -- CONTEÚDO ESTRUTURADO (MAP completo)
    -- ========================================
    content_json          JSONB NOT NULL DEFAULT '{
        "objetivo": null,
        "campo_aplicacao": null,
        "informacoes_complementares": null,
        "fluxo_processo": null,
        "fluxo_image_url": null,
        "atividades": [],
        "matriz_riscos": [],
        "inter_relacoes": [],
        "indicadores": []
    }'::jsonb,

    -- ========================================
    -- ACESSO E ATRIBUIÇÃO
    -- ========================================
    plan_access           JSONB NOT NULL DEFAULT '[]'::jsonb,
    responsible_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- HISTÓRICO DE VERSÕES
    -- ========================================
    version_history       JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- ========================================
    -- CATEGORIA LEGACY
    -- ========================================
    category_legacy       VARCHAR(200),

    -- ========================================
    -- CONTROLE
    -- ========================================
    created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_pdm_updated_at ON process_document_meta;
CREATE TRIGGER trg_pdm_updated_at
    BEFORE UPDATE ON process_document_meta
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_document_meta IS 'Meta 1:1 do MAP/IT. content_json pesado (objetivo, atividades[], matriz_riscos[], indicadores[]). version_history[]. CASCADE no pai.';


-- ============================================================================
-- 106. IMPLEMENTAÇÕES DE PROCESSO
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_implementations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- REFERÊNCIAS
    -- ========================================
    process_id            UUID NOT NULL REFERENCES process_documents(id) ON DELETE CASCADE,
    workshop_id           UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,

    -- ========================================
    -- RESPONSÁVEL (SET NULL — fotografia)
    -- ========================================
    responsible_id        UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ========================================
    -- DATAS
    -- ========================================
    start_date            DATE,
    target_date           DATE,
    completion_date       DATE,

    -- ========================================
    -- STATUS
    -- ========================================
    status                VARCHAR(12) NOT NULL DEFAULT 'planejada' CHECK (status IN (
                            'planejada', 'em_andamento', 'concluida', 'cancelada'
                          )),
    completion_percentage NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (
                            completion_percentage >= 0 AND completion_percentage <= 100
                          ),

    -- ========================================
    -- CHECKLIST DE CONFORMIDADE
    -- ========================================
    checklist             JSONB NOT NULL DEFAULT '{
        "treinamento_realizado": false,
        "comunicacao_interna": false,
        "processo_em_uso": false,
        "evidencias_anexadas": false
    }'::jsonb,

    -- ========================================
    -- EVIDÊNCIAS
    -- ========================================
    evidences             JSONB NOT NULL DEFAULT '[]'::jsonb,

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
    CONSTRAINT chk_pi_concluida_coerencia
        CHECK (
            (status = 'concluida' AND completion_date IS NOT NULL)
            OR (status <> 'concluida')
        ),

    CONSTRAINT chk_pi_target_after_start
        CHECK (target_date IS NULL OR start_date IS NULL OR target_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_pi_workshop         ON process_implementations(workshop_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pi_process          ON process_implementations(workshop_id, process_id) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pi_status           ON process_implementations(workshop_id, status) WHERE is_active IS TRUE;
CREATE INDEX IF NOT EXISTS idx_pi_responsible      ON process_implementations(workshop_id, responsible_id) WHERE responsible_id IS NOT NULL AND is_active IS TRUE;

DROP TRIGGER IF EXISTS trg_pi_updated_at ON process_implementations;
CREATE TRIGGER trg_pi_updated_at
    BEFORE UPDATE ON process_implementations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE process_implementations IS 'Deploy de MAP/IT por oficina. Checklist de conformidade JSONB, evidências JSONB. Mão dupla: concluida exige completion_date. NÃO conflita com implementation_tracking (Bloco 06).';

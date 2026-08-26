-- ============================================================================
-- EXECUTAR BLOCO 13 — Processos / Qualidade (11 tabelas: 103 a 113)
-- Execute no pgAdmin (Query Tool) — copie/cole cada arquivo na ordem
-- ============================================================================

-- ORDEM DE EXECUÇÃO:
-- 1. 103_process_areas.sql                    → process_areas
-- 2. 104_105_106_process_documents.sql        → process_documents, process_document_meta,
--                                                process_implementations
-- 3. 107_108_109_110_process_quality.sql      → process_indicators, process_indicator_meta,
--                                                process_assessments, process_assessment_meta
-- 4. 111_112_113_process_audits.sql           → process_audits, process_audit_meta,
--                                                process_shares

-- ============================================================================
-- VERIFICAÇÃO: contar tabelas criadas neste bloco
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'process_areas',
    'process_documents', 'process_document_meta', 'process_implementations',
    'process_indicators', 'process_indicator_meta',
    'process_assessments', 'process_assessment_meta',
    'process_audits', 'process_audit_meta',
    'process_shares'
  )
ORDER BY table_name;

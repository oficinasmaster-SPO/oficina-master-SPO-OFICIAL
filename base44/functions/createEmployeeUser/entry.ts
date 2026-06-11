/**
 * createEmployeeUser — DEPRECATED
 *
 * Este endpoint foi aposentado em 2026-06-11 (R6 — Auditoria Final).
 *
 * Migração:
 *   Use createUserDirectly diretamente.
 *   Todos os callers já foram migrados. Paridade funcional total confirmada.
 *
 * Histórico:
 *   R4/R5 — Limpeza de órfãos e convites expirados
 *   R6     — Unificação do fluxo + validação de plano portada para createUserDirectly
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
  } catch (_) {
    // auth falhou — ainda retorna 410
  }

  return Response.json({
    success: false,
    error: {
      code: 'GONE',
      message: 'Este endpoint foi descontinuado. Use createUserDirectly.'
    }
  }, { status: 410 });
});
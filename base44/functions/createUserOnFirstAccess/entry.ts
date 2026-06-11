/**
 * @deprecated ARQUIVADO — Dead code (2026-06-11)
 * Este endpoint usava BASE44_SERVICE_ROLE_KEY (não existe na plataforma) e tentava
 * definir senha via API interna não suportada.
 * O fluxo real de primeiro acesso é gerenciado por `completeInviteOnFirstAccess`.
 * Mantido apenas para evitar 404 em chamadas legadas — retorna 410 Gone.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (_req) => {
  return Response.json({
    success: false,
    deprecated: true,
    error: 'Esta função foi arquivada. Use completeInviteOnFirstAccess para o fluxo de primeiro acesso.'
  }, { status: 410 });
});
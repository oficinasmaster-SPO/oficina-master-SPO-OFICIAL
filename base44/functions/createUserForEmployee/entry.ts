import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// R14 (2026-06-11): Endpoint legado descontinuado.
// Callers auditados em 2026-06-11 — 0 chamadas ativas identificadas no frontend ou em outras functions.
// Fluxo canônico: createUserDirectly (usuários internos e externos de oficinas).
// Retorna 410 Gone para sinalizar remoção definitiva no próximo ciclo.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    console.warn(`[createUserForEmployee] 410 Gone — chamado por ${user?.email || 'desconhecido'}. Migre para createUserDirectly.`);
  } catch (_) {
    // não bloquear o 410 por falha de auth
  }

  return Response.json({
    success: false,
    gone: true,
    error: 'createUserForEmployee foi descontinuado. Use createUserDirectly.',
    migration: 'createUserDirectly'
  }, { status: 410 });
});
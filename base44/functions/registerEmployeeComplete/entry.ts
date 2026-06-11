import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// R2 FIX (2026-06-11): FUNÇÃO LEGADA — DEPRECADA
//
// Problemas identificados na auditoria:
// 1. Senha "Oficina@2025" hardcoded exposta no payload JSON retornado e no ActiveCampaign
// 2. Sem idempotência — chamadas duplicadas criam registros duplicados
// 3. Timing de 800ms frágil para vincular user_id ao Employee (condição de corrida)
// 4. Duplica lógica já coberta por createUserDirectly + automação createEmployeeOnUserCreation
//
// MIGRAÇÃO: Substitua todas as chamadas por createUserDirectly que implementa o fluxo canônico.
//
// Esta função agora retorna erro imediato para forçar migração dos callers.
// Callers conhecidos: nenhum ativo identificado na auditoria (ConvidarColaborador já usa createUserDirectly).

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Verificar autenticação antes de responder
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
  } catch (_) {
    return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
  }

  return Response.json({
    success: false,
    deprecated: true,
    error: 'registerEmployeeComplete está deprecada. Use createUserDirectly para criar colaboradores.',
    migration: {
      function: 'createUserDirectly',
      docs: 'Passe: { name, email, telefone, position, job_role, profile_id, workshop_id, role }'
    }
  }, { status: 410 }); // 410 Gone — recurso intencionalmente removido
});
// DEPRECADO — Esta função foi substituída por updateUserRoleAdmin.
// Use: /UsuariosAdmin → lista de usuários → "Promover para Admin"
// que chama updateUserRoleAdmin de forma segura e auditada.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  return Response.json({
    success: false,
    deprecated: true,
    error: 'promoteUserToAdmin está deprecada. Use updateUserRoleAdmin via /UsuariosAdmin.',
    migration: {
      function: 'updateUserRoleAdmin',
      ui: '/UsuariosAdmin → Promover para Admin'
    }
  }, { status: 410 });
});
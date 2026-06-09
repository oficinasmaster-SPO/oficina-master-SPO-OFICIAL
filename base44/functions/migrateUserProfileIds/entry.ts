/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapeamento completo de IDs legados para canônicos
// Inclui todos os perfis que foram substituídos pelos novos perfis canônicos
const LEGACY_TO_CANONICAL = {
  // Gerente - Gestão Operacional (canônico: 6a272f8976cba10c3232779a)
  '6a284dac50ab23107b42e146': '6a272f8976cba10c3232779a',
  
  // Sócio - Acesso Total (canônico: 6a272f8ea3fa8dd02ca7350e)
  '6a272f8ea3fa8dd02ca7350e': '6a272f8ea3fa8dd02ca7350e',
  
  // Diretor - Gestão Estratégica (canônico: 6a272f8a983951dfc5cf3493)
  '6a272f8a983951dfc5cf3493': '6a272f8a983951dfc5cf3493',
  
  // Supervisor - Operação e Equipe (canônico: 6a272f91b92f3d2dfe6344be)
  '6a272f91b92f3d2dfe6344be': '6a272f91b92f3d2dfe6344be',
  
  // RH - Gestão de Pessoas (canônico: 6a272f883b2162c800073ace)
  '6a272f883b2162c800073ace': '6a272f883b2162c800073ace',
  
  // Financeiro - Controle Financeiro (canônico: 6a285fc9f76402dd73736656)
  '6a285fc9f76402dd73736656': '6a285fc9f76402dd73736656',
  
  // Líder Técnico - Coordenação Técnica (canônico: 6a272f85fc4b85767f964421)
  '6a272f85fc4b85767f964421': '6a272f85fc4b85767f964421',
  
  // Comercial - Vendas e Atendimento (canônico: 6a272f96bc6eedd434194fcf)
  '6a272f96bc6eedd434194fcf': '6a272f96bc6eedd434194fcf',
  
  // Vendedor - Atendimento ao Cliente (canônico: 6a272f876b16129b2f5f31be)
  '6a272f876b16129b2f5f31be': '6a272f876b16129b2f5f31be',
  
  // Marketing - Comunicação e Marketing (canônico: 6a272f99aaeffc72c503fa5e)
  '6a272f99aaeffc72c503fa5e': '6a272f99aaeffc72c503fa5e',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';

  try {
    const base44 = createClientFromRequest(req);
    const legacyIds = Object.keys(LEGACY_TO_CANONICAL);
    const affected = [];

    console.log(`🔍 Buscando usuários com ${legacyIds.length} IDs de perfil diferentes...`);

    for (const legacyId of legacyIds) {
      const users = await base44.asServiceRole.entities.User
        .filter({ 'data.profile_id': legacyId })
        .catch((err) => {
          console.error(`Erro ao buscar perfil ${legacyId}:`, err.message);
          return [];
        });
      
      console.log(`Perfil ${legacyId}: ${users.length} usuários encontrados`);
      
      for (const user of users) {
        affected.push({
          user_id: user.id,
          email: user.email,
          old_profile_id: legacyId,
          new_profile_id: LEGACY_TO_CANONICAL[legacyId],
        });
      }
    }

    console.log(`✅ Total de usuários para migrar: ${affected.length}`);

    if (dry_run) {
      return Response.json({ 
        mode: 'dry_run', 
        users_to_migrate: affected.length, 
        preview: affected,
        legacy_ids_checked: legacyIds.length
      });
    }

    const results = { success: 0, failed: 0, errors: [] };
    for (const item of affected) {
      try {
        await base44.asServiceRole.entities.User.update(item.user_id, { 
          'data.profile_id': item.new_profile_id 
        });
        results.success++;
        console.log(`✅ Migrado: ${item.email}`);
      } catch (err) {
        results.failed++;
        results.errors.push(`${item.email}: ${err?.message}`);
        console.error(`❌ Erro ao migrar ${item.email}:`, err.message);
      }
    }

    return Response.json({
      mode: 'execute',
      users_found: affected.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      migrated: affected.map(i => ({ email: i.email, new_profile_id: i.new_profile_id })),
    });

  } catch (err) {
    console.error('Erro geral:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
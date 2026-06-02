import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * seedConsultingFirm — cria o registro da Oficinas Master na entidade ConsultingFirm.
 * IDEMPOTENTE: verifica se já existe antes de criar.
 * Invocar UMA VEZ via: base44.functions.invoke('seedConsultingFirm')
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const requestingUser = await base44.auth.me();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verificar se já existe
    const existing = await base44.asServiceRole.entities.ConsultingFirm.filter({});
    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'ConsultingFirm já existe — nenhuma ação necessária.',
        record: existing[0],
      });
    }

    // Criar registro da Oficinas Master
    const record = await base44.asServiceRole.entities.ConsultingFirm.create({
      name: 'Oficinas Master',
      razao_social: 'Oficinas Master Consultoria',
      cnpj: '00.000.000/0001-00', // substituir pelo CNPJ real
      email: 'contato@oficinasmaster.com.br',
      owner_id: requestingUser.id,
      plan_type: 'enterprise',
      status: 'ativo',
      allowed_domains: ['oficinasmaster.com.br'],
    });

    console.log('✅ ConsultingFirm criada:', record.id);

    return Response.json({
      success: true,
      message: 'ConsultingFirm criada com sucesso!',
      record,
      proximo_passo: `Adicionar ao .env: CONSULTING_FIRM_ID=${record.id}`,
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
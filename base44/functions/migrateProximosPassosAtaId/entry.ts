import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔄 Migrando próximos passos sem ata_id...');

    // Buscar TODOS os passos que NÃO têm ata_id (mas têm consultoria_atendimento_id)
    const passosSemAtaId = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
      ata_id: null  // Sem ata_id
    }, '-created_date', 1000);

    console.log(`📊 Encontrados ${passosSemAtaId.length} passos sem ata_id`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const passo of passosSemAtaId) {
      try {
        let foundAtaId = null;

        // TENTATIVA 1: Se tem consultoria_atendimento_id, buscar a ATA vinculada
        if (passo.consultoria_atendimento_id) {
          const atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.get(
            passo.consultoria_atendimento_id
          ).catch(() => null);

          if (atendimento?.ata_id) {
            foundAtaId = atendimento.ata_id;
          }
        }

        // TENTATIVA 2 (FALLBACK): Se atendimento foi deletado, buscar ATA mais recente da oficina
        if (!foundAtaId && passo.workshop_id) {
          console.log(`🔍 Passo ${passo.id}: Buscando ATA mais recente da workshop ${passo.workshop_id}...`);
          const atasRecentes = await base44.asServiceRole.entities.MeetingMinutes.filter({
            workshop_id: passo.workshop_id
          }, '-created_date', 1);

          if (atasRecentes.length > 0) {
            foundAtaId = atasRecentes[0].id;
            console.log(`✅ ATA encontrada (fallback): ${atasRecentes[0].code}`);
          }
        }

        if (foundAtaId) {
          console.log(`✅ Atualizando passo ${passo.id}: ${passo.titulo} → ata_id: ${foundAtaId}`);
          await base44.asServiceRole.entities.ConsultoriaProximoPasso.update(passo.id, {
            ata_id: foundAtaId
          });
          updated++;
        } else {
          console.warn(`⚠️ Passo ${passo.id}: Não foi possível resolver ATA (atendimento deletado, nenhuma ATA na oficina)`);
          skipped++;
        }
      } catch (err) {
        console.error(`❌ Erro ao atualizar passo ${passo.id}:`, err.message);
        failed++;
      }
    }

    return Response.json({
      success: true,
      message: `Migração concluída: ${updated} atualizados, ${skipped} pulados, ${failed} erros`,
      updated,
      skipped,
      failed
    });
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
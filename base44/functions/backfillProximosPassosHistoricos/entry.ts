import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Gerar hash do conteúdo para idempotência
async function generateHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

/**
 * MIGRAÇÃO RETROATIVA (BACKFILL)
 * 
 * Problema: Próximos passos de ATAs antigas não foram sincronizados com:
 * - ConsultoriaProximoPasso (operacional)
 * - FollowUpReminder.message (card do follow-up)
 * 
 * Solução: Varre todas as ATAs desde 2025-01-01 e sincroniza os próximos passos
 * 
 * Uso: Rodar manualmente via dashboard ou agendar como one-time
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem rodar backfill' }, { status: 403 });
    }

    console.log('🔧 Iniciando backfill de próximos passos históricos...');

    // 1. Buscar todas as ATAs desde 2025-01-01
    const atas = await base44.asServiceRole.entities.MeetingMinutes.filter(
      { meeting_date: { $gte: '2025-01-01' } },
      '-meeting_date',
      500 // limite para não estourar timeout
    );

    console.log(`📄 Encontradas ${atas.length} ATAs para processar`);

    let totalProcessadas = 0;
    let totalSincronizadas = 0;
    let totalErros = 0;

    for (const ata of atas) {
      try {
        totalProcessadas++;

        // Pular se não tem próximos passos
        const proximosPassos = ata.proximos_passos_list || [];
        if (!proximosPassos || proximosPassos.length === 0) {
          console.log(`⏭️  ATA ${ata.code || ata.id}: sem próximos passos`);
          continue;
        }

        // 2. Sincronizar com ConsultoriaProximoPasso (usando hash para idempotência)
        for (const pp of proximosPassos) {
          try {
            // Gerar hash do conteúdo
            const contentToHash = `${pp.descricao || pp.titulo}|${pp.responsavel || ''}|${pp.prazo || ''}`;
            const passoHash = await generateHash(contentToHash);

            // Verificar se já existe pelo hash (mais robusto que texto exato)
            const existentes = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
              workshop_id: ata.workshop_id,
              item_id_hash: passoHash,
            }, '-created_date', 1);

            if (existentes && existentes.length > 0) {
              console.log(`✓ PP "${pp.descricao?.substring(0, 30)}" já existe (hash: ${passoHash})`);
              continue;
            }

            // Criar próximo passo operacional com hash
            await base44.asServiceRole.entities.ConsultoriaProximoPasso.create({
              workshop_id: ata.workshop_id,
              consulting_firm_id: ata.consulting_firm_id || null,
              consultoria_atendimento_id: ata.atendimento_id || null,
              consultor_id: ata.consultor_id || null,
              titulo: pp.descricao || pp.titulo || 'Próximo passo sem descrição',
              responsavel_nome: pp.responsavel || 'Não definido',
              prazo: pp.prazo || null,
              status: 'pendente',
              prioridade: 'media',
              origem: 'ata',
              item_id_hash: passoHash, // ✅ Hash para idempotência
              observacoes_consultor: `Migrado via backfill da ATA ${ata.code || ata.id} em ${new Date().toISOString()}`,
              historico: [{
                tipo: 'criacao',
                descricao: 'Migração retroativa via backfill',
                usuario_id: user.id,
                usuario_nome: user.full_name,
                timestamp: new Date().toISOString(),
              }],
            });

            totalSincronizadas++;
            console.log(`✅ PP criado: "${pp.descricao?.substring(0, 30)}..." para ${ata.workshop_id}`);
          } catch (err) {
            console.error(`❌ Erro ao criar PP "${pp.descricao}":`, err.message);
            totalErros++;
          }
        }

        // 3. Atualizar FollowUpReminder.message (se houver FUs vinculados)
        try {
          const followUps = await base44.asServiceRole.entities.FollowUpReminder.filter({
            ata_id: ata.id,
            is_completed: false
          });

          if (followUps && followUps.length > 0) {
            // Gerar resumo dos próximos passos
            const resumoPP = proximosPassos
              .slice(0, 3)
              .map(pp => `• ${pp.descricao || pp.titulo || 'Sem descrição'}`)
              .join('\n');

            for (const fu of followUps) {
              await base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
                message: resumoPP || fu.message,
                notes: fu.notes ? `${fu.notes}\n\n[Backfill ${new Date().toISOString().split('T')[0]}] Próximos passos sincronizados` : `[Backfill ${new Date().toISOString().split('T')[0]}] Próximos passos sincronizados`,
              });
            }

            console.log(`📢 ${followUps.length} follow-up(s) atualizados com message`);
          }
        } catch (err) {
          console.error(`❌ Erro ao atualizar FUs da ATA ${ata.id}:`, err.message);
        }

      } catch (err) {
        console.error(`❌ Erro ao processar ATA ${ata.id}:`, err.message);
        totalErros++;
      }
    }

    const resumo = {
      sucesso: true,
      totalProcessadas,
      totalSincronizadas,
      totalErros,
      mensagem: `Backfill concluído: ${totalSincronizadas} próximos passos migrados de ${totalProcessadas} ATAs`,
    };

    console.log('✅ BACKFILL CONCLUÍDO:', resumo);

    return Response.json(resumo);
  } catch (error) {
    console.error('Erro crítico no backfill:', error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});
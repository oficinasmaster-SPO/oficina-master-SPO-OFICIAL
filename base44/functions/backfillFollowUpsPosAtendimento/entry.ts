import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import moment from 'npm:moment@2.30.1';

/**
 * Backfill: Cria follow-ups automáticos para clientes esquecidos
 * Varre todos atendimentos realizados sem follow-up vinculado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { dias_minimo = 7, limite = 100 } = payload || {};

    // 1. Buscar todos atendimentos realizados/concluídos
    const todosAtendimentos = await base44.entities.ConsultoriaAtendimento.filter({
      status: ['realizado', 'concluido']
    });

    console.log(`Total atendimentos encontrados: ${todosAtendimentos.length}`);

    const planosElegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
    const hoje = moment().tz('America/Sao_Paulo');
    const resultados = {
      criados: 0,
      ignorados: 0,
      erros: 0,
      detalhes: []
    };

    // 2. Processar cada atendimento
    for (const atendimento of todosAtendimentos) {
      try {
        // Limitar processamento
        if (resultados.criados >= limite) {
          break;
        }

        // 3. Buscar workshop
        const workshop = await base44.entities.Workshop.get(atendimento.workshop_id);
        if (!workshop) {
          resultados.ignorados++;
          resultados.detalhes.push({
            atendimento_id: atendimento.id,
            motivo: 'Workshop não encontrado',
            action: 'skip'
          });
          continue;
        }

        // 4. Verificar plano
        if (!planosElegiveis.includes(workshop.planoAtual)) {
          resultados.ignorados++;
          resultados.detalhes.push({
            atendimento_id: atendimento.id,
            workshop: workshop.name,
            plano: workshop.planoAtual,
            motivo: 'Plano não elegível',
            action: 'skip'
          });
          continue;
        }

        // 5. Verificar se já existe follow-up pendente
        const followUpsPendentes = await base44.entities.FollowUpReminder.filter({
          workshop_id: workshop.id,
          is_completed: false
        });

        if (followUpsPendentes && followUpsPendentes.length > 0) {
          resultados.ignorados++;
          resultados.detalhes.push({
            atendimento_id: atendimento.id,
            workshop: workshop.name,
            motivo: 'Já possui follow-up pendente',
            action: 'skip'
          });
          continue;
        }

        // 6. Verificar último contato
        const followUpsConcluidos = await base44.entities.FollowUpConcluido.filter({
          workshop_id: workshop.id
        }, '-completedAt', 1);

        if (followUpsConcluidos && followUpsConcluidos.length > 0) {
          const ultimoContato = followUpsConcluidos[0];
          const dataUltimoContato = moment(ultimoContato.dataContato || ultimoContato.completedAt);
          const diasDesdeUltimoContato = hoje.diff(dataUltimoContato, 'days');

          if (diasDesdeUltimoContato < dias_minimo) {
            resultados.ignorados++;
            resultados.detalhes.push({
              atendimento_id: atendimento.id,
              workshop: workshop.name,
              dias_sem_contato: diasDesdeUltimoContato,
              motivo: `Contato recente (< ${dias_minimo} dias)`,
              action: 'skip'
            });
            continue;
          }
        }

        // 7. Verificar se atendimento é antigo o suficiente
        const dataRealizada = moment(atendimento.data_realizada || atendimento.updated_date);
        const diasDesdeAtendimento = hoje.diff(dataRealizada, 'days');

        if (diasDesdeAtendimento < dias_minimo) {
          resultados.ignorados++;
          resultados.detalhes.push({
            atendimento_id: atendimento.id,
            workshop: workshop.name,
            dias_desde_atendimento: diasDesdeAtendimento,
            motivo: 'Atendimento recente',
            action: 'skip'
          });
          continue;
        }

        // 8. Calcular sequência
        const totalFollowUps = (followUpsPendentes?.length || 0) + (followUpsConcluidos?.length || 0);
        const sequenceNumber = totalFollowUps + 1;

        // 9. Criar follow-up
        await base44.entities.FollowUpReminder.create({
          workshop_id: workshop.id,
          workshop_name: workshop.name,
          consultor_id: atendimento.consultor_id || user.id,
          consultor_nome: atendimento.consultor_nome || user.full_name,
          atendimento_id: atendimento.id,
          ata_id: null,
          reminder_date: hoje.format('YYYY-MM-DD'),
          sequence_number: sequenceNumber,
          days_since_meeting: diasDesdeAtendimento,
          message: `Follow-up backfill - Atendimento realizado em ${moment(atendimento.data_realizada).format('DD/MM/YYYY')}`,
          is_completed: false,
          origin_type: 'backfill_automatico',
          canal_origem: null,
          notes: `Backfill: atendimento realizado há ${diasDesdeAtendimento} dias sem follow-up`,
          consulting_firm_id: workshop.consulting_firm_id || null
        });

        resultados.criados++;
        resultados.detalhes.push({
          atendimento_id: atendimento.id,
          workshop: workshop.name,
          plano: workshop.planoAtual,
          dias_desde_atendimento: diasDesdeAtendimento,
          sequence_number: sequenceNumber,
          action: 'created'
        });

        console.log(`✓ Follow-up criado: ${workshop.name} (atendimento ${atendimento.id})`);

      } catch (error) {
        resultados.erros++;
        resultados.detalhes.push({
          atendimento_id: atendimento.id,
          erro: error.message,
          action: 'error'
        });
        console.error(`Erro ao processar atendimento ${atendimento.id}:`, error);
      }
    }

    // 10. Log analytics
    await base44.analytics.track({
      eventName: 'followup_backfill_executado',
      properties: {
        criados: resultados.criados,
        ignorados: resultados.ignorados,
        erros: resultados.erros,
        total_processados: resultados.criados + resultados.ignorados + resultados.erros
      }
    });

    return Response.json({
      success: true,
      message: `Backfill concluído: ${resultados.criados} criados, ${resultados.ignorados} ignorados, ${resultados.erros} erros`,
      resultados
    });

  } catch (error) {
    console.error('Erro no backfill:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
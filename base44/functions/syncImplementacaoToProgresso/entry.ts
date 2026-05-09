import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { differenceInDays } from 'npm:date-fns@3.6.0';

/**
 * syncImplementacaoToProgresso — SYNC UNIDIRECIONAL (write → read)
 *
 * Projeta CronogramaImplementacao → CronogramaProgresso.
 * Este é o ÚNICO fluxo permitido. NÃO sincronize no sentido inverso.
 *
 * Pode ser chamado:
 *   - por entity automation (update em CronogramaImplementacao)
 *   - por markCronogramaCompleted
 *   - por trackImplementacao (após update de progresso significativo)
 *   - manualmente por admin (passar workshop_id para sync em massa)
 *
 * Parâmetros:
 *   implementacao_id  — sincronizar item específico (recomendado)
 *   workshop_id       — sincronizar todos os itens da oficina (admin batch)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { implementacao_id, workshop_id } = await req.json();

    if (!implementacao_id && !workshop_id) {
      return Response.json({ error: 'implementacao_id ou workshop_id obrigatório' }, { status: 400 });
    }

    // Resolver quais itens sincronizar
    let itens = [];
    if (implementacao_id) {
      const item = await base44.asServiceRole.entities.CronogramaImplementacao.filter({ id: implementacao_id });
      itens = item || [];
    } else {
      // Batch por workshop — apenas admin
      if (user.role !== 'admin') {
        return Response.json({ error: 'Batch sync requer admin' }, { status: 403 });
      }
      itens = await base44.asServiceRole.entities.CronogramaImplementacao.filter(
        { workshop_id },
        'ordem',
        200
      );
    }

    if (!itens.length) {
      return Response.json({ success: true, synced: 0, message: 'Nenhum item para sincronizar' });
    }

    const now = new Date().toISOString();
    let synced = 0;
    const errors = [];

    for (const impl of itens) {
      try {
        // Mapear status do write model para situação do read model
        let situacao = 'nao_iniciado';
        if (impl.status === 'concluido') {
          situacao = 'concluido';
        } else if (impl.status === 'em_andamento') {
          if (impl.data_termino_previsto) {
            const diasAtraso = differenceInDays(new Date(), new Date(impl.data_termino_previsto));
            situacao = diasAtraso > 0 ? 'atrasado' : 'em_andamento';
          } else {
            situacao = 'em_andamento';
          }
        } else if (impl.status === 'a_fazer' && impl.data_inicio_real) {
          situacao = 'nao_iniciado';
        }

        const progressoPayload = {
          workshop_id: impl.workshop_id,
          implementacao_id: impl.id,
          read_model_version: 'derived_v1',
          source_engine: impl.engine_version || 'unknown',
          synced_at: now,
          modulo_codigo: impl.item_id,
          modulo_nome: impl.item_nome,
          situacao,
          fase_oficina: impl.fase ? faseNomeParaNumero(impl.fase) : 1,
          ordem: impl.ordem || 0,
          tipo_conteudo: mapTipoConteudo(impl.item_tipo),
          data_inicio_previsto: impl.data_inicio_real ? impl.data_inicio_real.split('T')[0] : null,
          data_visualizacao: impl.data_inicio_real || null,
          data_conclusao_previsto: impl.data_termino_previsto ? impl.data_termino_previsto.split('T')[0] : null,
          data_conclusao_realizado: impl.data_termino_real ? impl.data_termino_real.split('T')[0] : null,
          atividades_realizadas: impl.progresso_percentual || 0,
          atividades_previstas: 100
        };

        // Upsert por implementacao_id (preferred) ou por modulo_codigo + workshop_id
        const existing = await base44.asServiceRole.entities.CronogramaProgresso.filter({
          workshop_id: impl.workshop_id,
          implementacao_id: impl.id
        });

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.CronogramaProgresso.update(existing[0].id, progressoPayload);
        } else {
          // Tentar encontrar por modulo_codigo (legado sem implementacao_id)
          const byModulo = await base44.asServiceRole.entities.CronogramaProgresso.filter({
            workshop_id: impl.workshop_id,
            modulo_codigo: impl.item_id
          });
          if (byModulo && byModulo.length > 0) {
            await base44.asServiceRole.entities.CronogramaProgresso.update(byModulo[0].id, progressoPayload);
          } else {
            await base44.asServiceRole.entities.CronogramaProgresso.create(progressoPayload);
          }
        }

        synced++;
      } catch (e) {
        console.error(`[sync] Erro no item ${impl.id}:`, e.message);
        errors.push({ id: impl.id, error: e.message });
      }
    }

    console.log(`[syncImplementacaoToProgresso] ${synced} itens sincronizados, ${errors.length} erros`);

    return Response.json({
      success: true,
      synced,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[syncImplementacaoToProgresso] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helpers

function mapTipoConteudo(item_tipo) {
  const map = {
    diagnostico: 'diagnostico',
    teste: 'teste',
    processo: 'processo',
    funcionalidade: 'processo',
    ferramenta: 'processo',
    modulo: 'processo',
    atendimento: 'processo',
    treinamento: 'processo'
  };
  return map[item_tipo] || 'processo';
}

function faseNomeParaNumero(fase) {
  const map = {
    estrutura: 1, sobrevivencia: 1,
    crescimento: 2,
    organizacao: 3, lideranca: 3,
    escala: 4, consolidacao: 4
  };
  const key = (fase || '').toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return 1;
}
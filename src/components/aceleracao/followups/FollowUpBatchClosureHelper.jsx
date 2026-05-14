/**
 * FollowUpBatchClosureHelper
 * Gerencia conclusão em massa de múltiplos FUs com metadata consolidada
 */
import { base44 } from '@/api/base44Client';

export async function criarConclusoesFUEmMassa({
  fusConcluidos = [], // Array de FUs (originais já salvos como FollowUpReminder.is_completed=true)
  fusEmMassa = [], // Array de IDs dos FUs selecionados no checkpoint modal
  atendimentoDados = {}, // { canal, resultado, observacoes, etc }
  usuario = null, // { id, full_name }
  workshopId = null,
  consultorId = null,
}) {
  if (!usuario?.id) throw new Error('Usuário não identificado');
  if (!workshopId) throw new Error('workshop_id obrigatório');

  const batchGroupId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const agora = new Date().toISOString();

  try {
    // 1️⃣ Gerar todos os registros de FollowUpConcluido para os FUs da conclusão em massa
    const todosOsFUsParaSalvar = [
      ...fusConcluidos, // FUs originais do atendimento
      ...fusEmMassa // FUs selecionados no modal
    ];

    const registrosConcluidos = todosOsFUsParaSalvar.map(fu => {
      const followUpId = typeof fu === 'string' ? fu : fu.id;
      return {
        followup_id: followUpId,
        workshop_id: workshopId,
        consultor_id: consultorId || usuario.id,
        consultor_nome: usuario.full_name,
        
        // Dados do atendimento replicados
        canal: atendimentoDados.canal || 'reuniao',
        resultado: atendimentoDados.resultado || 'atendeu',
        dataContato: new Date().toISOString().split('T')[0],
        observacoes: atendimentoDados.observacoes || '',
        proximoPasso: atendimentoDados.proximoPasso || 'reagendar',
        
        // Metadata de conclusão
        concluded_by_id: usuario.id,
        concluded_by_name: usuario.full_name,
        concluded_at: agora,
        batch_group_id: batchGroupId,
        is_batch_close: true, // Marca como conclusão em massa
        
        completedAt: agora,
      };
    });

    // 2️⃣ Salvar todos os registros de conclusão
    if (registrosConcluidos.length > 0) {
      await base44.entities.FollowUpConcluido.bulkCreate(registrosConcluidos);
    }

    return {
      success: true,
      batchGroupId,
      totalClosed: registrosConcluidos.length,
      timestamp: agora,
    };
  } catch (error) {
    console.error('Erro ao criar conclusões em massa:', error);
    throw new Error(`Falha ao registrar conclusão em massa: ${error.message}`);
  }
}

/**
 * Buscar histórico consolidado de FUs concluídos em uma ação
 */
export async function buscarHistoricoFUsEmMassa(batchGroupId) {
  try {
    const registros = await base44.entities.FollowUpConcluido.filter({
      batch_group_id: batchGroupId,
    }, '-concluded_at', 100);
    
    return registros;
  } catch (error) {
    console.error('Erro ao buscar histórico em massa:', error);
    return [];
  }
}

/**
 * Agrupar conclusões por batch_group_id para exibir no card consolidado
 */
export function agruparFUsPorBatch(concluidos = []) {
  const grupos = {};
  
  concluidos.forEach(fu => {
    if (fu.is_batch_close && fu.batch_group_id) {
      if (!grupos[fu.batch_group_id]) {
        grupos[fu.batch_group_id] = {
          batch_group_id: fu.batch_group_id,
          concluded_at: fu.concluded_at,
          concluded_by_name: fu.concluded_by_name,
          canal: fu.canal,
          resultado: fu.resultado,
          totalFUs: 0,
          fusList: [],
        };
      }
      grupos[fu.batch_group_id].fusList.push({
        id: fu.followup_id,
        workshop_name: fu.workshop_name || 'Cliente',
        consultor_nome: fu.consultor_nome,
        observacoes: fu.observacoes,
      });
      grupos[fu.batch_group_id].totalFUs += 1;
    }
  });

  return Object.values(grupos).sort(
    (a, b) => new Date(b.concluded_at) - new Date(a.concluded_at)
  );
}
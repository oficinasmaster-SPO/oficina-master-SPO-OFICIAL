import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook: Sincronizar ContractAttendance (BUCKET) → ConsultoriaAtendimento
 * 
 * Quando BucketAtendimentosTab agenda um atendimento, este hook
 * marca o ContractAttendance como "agendado" automaticamente
 * 
 * @param {string} workshopId - ID da oficina
 * @param {object} queryClient - React Query client para invalidação
 */
export function useBucketToAtendimentoSync(workshopId, queryClient) {
  useEffect(() => {
    if (!workshopId || !queryClient) return;

    // Subscrever a mudanças em ConsultoriaAtendimento
    const unsubscribeAtendimento = base44.entities.ConsultoriaAtendimento.subscribe((event) => {
      if (event.data?.workshop_id === workshopId && event.type === 'create') {
        // Novo atendimento criado — marcar ContractAttendance como agendado
        handleAtendimentoAgendado(event.data, workshopId, queryClient);
      }
    });

    return unsubscribeAtendimento;
  }, [workshopId, queryClient]);
}

/**
 * Quando um ConsultoriaAtendimento é criado,
 * marcar o ContractAttendance vinculado como "agendado"
 */
async function handleAtendimentoAgendado(atendimento, workshopId, queryClient) {
  try {
    // Buscar ContractAttendance vinculado
    const contractAttendances = await base44.entities.ContractAttendance.filter({
      workshop_id: workshopId,
      attendance_type_id: atendimento.tipo_atendimento,
      status: 'pendente'
    }, '-created_date', 1);

    if (contractAttendances.length > 0) {
      const ca = contractAttendances[0];

      // Atualizar status para "agendado" + vincular atendimento
      await base44.entities.ContractAttendance.update(ca.id, {
        status: 'agendado',
        consultoria_atendimento_id: atendimento.id,
        scheduled_date: new Date().toISOString()
      });

      console.log(`✅ ContractAttendance ${ca.id} → agendado`);

      // Invalidar queries para recarregar
      queryClient.invalidateQueries({
        queryKey: ['contract-attendances', workshopId]
      });
    }
  } catch (error) {
    console.error('Erro ao sincronizar Bucket:', error);
  }
}
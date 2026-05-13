import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useDiagnosticFrequency(planId) {
  const queryClient = useQueryClient();

  // Buscar todas as frequências para este plano
  const { data: frequencies = [], isLoading, error } = useQuery({
    queryKey: ['diagnosticFrequency', planId],
    queryFn: async () => {
      if (!planId) return [];
      const result = await base44.entities.DiagnosticFrequency.filter(
        { plan_id: planId, is_active: true },
        'diagnostic_type'
      );
      return result;
    },
    enabled: !!planId
  });

  // Atualizar frequência
  const updateMutation = useMutation({
    mutationFn: async ({ frequency_id, data }) => {
      return base44.entities.DiagnosticFrequency.update(frequency_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticFrequency', planId] });
      toast.success('Frequência atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar frequência: ' + error.message);
    }
  });

  // Criar frequência (se não existir)
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.DiagnosticFrequency.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnosticFrequency', planId] });
      toast.success('Frequência criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar frequência: ' + error.message);
    }
  });

  // Atualizar ou criar
  const updateOrCreate = async (diagnosticType, updates) => {
    const existing = frequencies.find(f => f.diagnostic_type === diagnosticType);
    
    if (existing) {
      updateMutation.mutate({
        frequency_id: existing.id,
        data: updates
      });
    } else {
      createMutation.mutate({
        plan_id: planId,
        diagnostic_type: diagnosticType,
        is_active: true,
        ...updates
      });
    }
  };

  return {
    frequencies,
    isLoading,
    error,
    updateOrCreate,
    isUpdating: updateMutation.isPending || createMutation.isPending
  };
}
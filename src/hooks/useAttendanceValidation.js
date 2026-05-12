import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays, isAfter, isBefore, addDays, parseISO } from 'date-fns';

export function useAttendanceValidation(workshopId, attendanceTypeId, selectedDate) {
  // Fetch PlanAttendanceRule
  const { data: rule } = useQuery({
    queryKey: ['plan-rule', workshopId, attendanceTypeId],
    queryFn: async () => {
      if (!workshopId || !attendanceTypeId) return null;
      
      const workshop = await base44.entities.Workshop.get(workshopId);
      if (!workshop?.plan_id) return null;

      const rules = await base44.entities.PlanAttendanceRule.filter(
        { plan_id: workshop.plan_id, attendance_type_id: attendanceTypeId },
        null,
        1
      );
      return rules?.[0] || null;
    },
    enabled: !!workshopId && !!attendanceTypeId,
    staleTime: 10 * 60 * 1000
  });

  // Fetch historical attendances (realized/concluded only)
  const { data: historicalAttendances = [] } = useQuery({
    queryKey: ['historical-attendances', workshopId, attendanceTypeId],
    queryFn: async () => {
      if (!workshopId || !attendanceTypeId) return [];

      // ContractAttendance realized
      const contractAtts = await base44.entities.ContractAttendance.filter(
        { workshop_id: workshopId, attendance_type_id: attendanceTypeId, status: 'realizado' },
        '-consumed_at',
        100
      );

      // ConsultoriaAtendimento completed
      const consultoriaAtts = await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId, tipo_atendimento: attendanceTypeId, status: 'concluido' },
        '-hora_fim_real',
        100
      );

      return [
        ...(contractAtts || []).map(a => ({
          id: a.id,
          date: a.consumed_at || a.scheduled_date,
          source: 'contract'
        })),
        ...(consultoriaAtts || []).map(a => ({
          id: a.id,
          date: a.hora_fim_real || a.data_realizada,
          source: 'consultoria'
        }))
      ];
    },
    enabled: !!workshopId && !!attendanceTypeId,
    staleTime: 5 * 60 * 1000
  });

  // Calculate validations
  const limitExceeded = rule 
    ? historicalAttendances.length >= rule.total_allowed
    : false;

  const lastAttendanceDate = historicalAttendances.length > 0
    ? new Date(historicalAttendances[0].date)
    : null;

  const frequencyViolated = selectedDate && lastAttendanceDate && rule?.frequency_days
    ? differenceInDays(parseISO(selectedDate), lastAttendanceDate) < rule.frequency_days
    : false;

  const recommendedNextDate = lastAttendanceDate && rule?.frequency_days
    ? addDays(lastAttendanceDate, rule.frequency_days).toISOString().split('T')[0]
    : null;

  const remainingAttendances = rule
    ? Math.max(0, rule.total_allowed - historicalAttendances.length)
    : null;

  const warnings = [];
  if (limitExceeded) {
    warnings.push({
      type: 'limit',
      severity: 'error',
      message: `Cliente já teve ${historicalAttendances.length} de ${rule.total_allowed} atendimentos permitidos no plano.`
    });
  }
  if (frequencyViolated && rule?.frequency_days) {
    const daysSinceLastAttendance = differenceInDays(new Date(), lastAttendanceDate);
    warnings.push({
      type: 'frequency',
      severity: 'warning',
      message: `Último atendimento foi há ${daysSinceLastAttendance} dias. Recomendado: ${rule.frequency_days} dias de espaçamento.`
    });
  }

  return {
    limitExceeded,
    frequencyViolated,
    lastAttendanceDate,
    remainingAttendances,
    recommendedNextDate,
    warnings,
    rule,
    historicalAttendances,
    isLoading: !rule && !historicalAttendances.length
  };
}
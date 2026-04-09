import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import useWorkshopsAtivos from "./useWorkshopsAtivos";
import useConsultoresList from "./useConsultoresList";

/**
 * Hook central de estado para /controleaceleracao.
 * Fonte única de verdade para: user, filtros, consultor, período, atendimentos, workshops, consultores.
 * Todas as abas consomem os dados deste hook via props — sem queries duplicadas.
 */
export default function useControleAceleracaoState() {
  // ── User ──
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // ── Filtros centrais ──
  const [filtros, setFiltros] = useState({
    consultorId: "todos",
    preset: "mes_atual",
    dataInicio: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dataFim: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  // ── Dados derivados dos filtros ──
  const consultorEfetivo = useMemo(() => {
    if (filtros.consultorId && filtros.consultorId !== "todos") return filtros.consultorId;
    if (user?.role !== 'admin') return user?.id || null;
    return null; // admin sem filtro = todos
  }, [filtros.consultorId, user?.id, user?.role]);

  // ── Shared data queries ──
  const { data: workshops } = useWorkshopsAtivos();
  const { data: consultores } = useConsultoresList(user);

  // ── Atendimentos — query ÚNICA para todas as abas ──
  const { data: atendimentos, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id, consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) {
        query.consultor_id = consultorEfetivo;
      }
      return await base44.entities.ConsultoriaAtendimento.filter(query, '-data_agendada', 500);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });

  // ── Atendimentos filtrados por período ──
  const atendimentosPeriodo = useMemo(() => {
    if (!atendimentos) return [];
    const { dataInicio, dataFim } = filtros;
    if (!dataInicio || !dataFim) return atendimentos;
    return atendimentos.filter(a => {
      const d = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return d >= dataInicio && d <= dataFim;
    });
  }, [atendimentos, filtros.dataInicio, filtros.dataFim]);

  // ── Meeting minutes (shared between tabs that need it) ──
  const { data: atas } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: () => base44.entities.MeetingMinutes.list('-created_date', 5000),
    staleTime: 2 * 60 * 1000
  });

  // ── Monthly plans (shared) ──
  const { data: planos } = useQuery({
    queryKey: ['planos-aceleracao'],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  return {
    // Auth
    user,
    loadingUser,
    // Filtros
    filtros,
    setFiltros,
    consultorEfetivo,
    // Shared data
    workshops: workshops || [],
    consultores: consultores || [],
    atendimentos: atendimentos || [],
    atendimentosPeriodo,
    loadingAtendimentos,
    atas: atas || [],
    planos: planos || []
  };
}
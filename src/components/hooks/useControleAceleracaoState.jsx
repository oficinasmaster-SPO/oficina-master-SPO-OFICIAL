import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useWorkshopsAtivos from "./useWorkshopsAtivos";
import useConsultoresList from "./useConsultoresList";
import useControleAceleracaoURLState from "./useControleAceleracaoURLState";

/**
 * Hook central de estado para /controleaceleracao.
 * A URL é a fonte de verdade para: tab, filtros, modal.
 * Dados compartilhados: user, workshops, atendimentos, atas, planos.
 */
export default function useControleAceleracaoState() {
  // ── URL state (fonte de verdade) ──
  const urlState = useControleAceleracaoURLState();
  const { filtros, setFiltros, activeTab, setActiveTab, isModalOpen, atendimentoId, openModal, closeModal } = urlState;

  // ── User ──
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // ── Consultor efetivo (derivado dos filtros URL) ──
  const consultorEfetivo = useMemo(() => {
    if (filtros.consultorId && filtros.consultorId !== "todos") return filtros.consultorId;
    if (user?.role !== 'admin') return user?.id || null;
    return null;
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

  // ── Meeting minutes (limited to 500 for perf) ──
  const { data: atas } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: () => base44.entities.MeetingMinutes.list('-created_date', 500),
    staleTime: 3 * 60 * 1000
  });

  // ── Lookup maps for O(1) access in child components ──
  const workshopMap = useMemo(() => {
    const map = {};
    (workshops || []).forEach(w => { map[w.id] = w; });
    return map;
  }, [workshops]);

  const atasMap = useMemo(() => {
    const map = {};
    (atas || []).forEach(a => { map[a.id] = a; });
    return map;
  }, [atas]);

  // ── Monthly plans ──
  const { data: planos } = useQuery({
    queryKey: ['planos-aceleracao'],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list('-created_date'),
    staleTime: 5 * 60 * 1000
  });

  return {
    // Auth
    user,
    loadingUser,
    // URL-synced state
    activeTab,
    setActiveTab,
    isModalOpen,
    atendimentoId,
    openModal,
    closeModal,
    // Filtros (URL-synced)
    filtros,
    setFiltros,
    consultorEfetivo,
    // Shared data
    workshops: workshops || [],
    workshopMap,
    consultores: consultores || [],
    atendimentos: atendimentos || [],
    atendimentosPeriodo,
    loadingAtendimentos,
    atas: atas || [],
    atasMap,
    planos: planos || []
  };
}
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useWorkshopsAtivos from "./useWorkshopsAtivos";
import useConsultoresList from "./useConsultoresList";
import useControleAceleracaoURLState from "./useControleAceleracaoURLState";
import useFiltrosControle from "./useFiltrosControle";

/**
 * Composição central de estado para /controleaceleracao.
 *
 * Camadas:
 *  1. useControleAceleracaoURLState — URL ↔ estado (tab, filtros, modal)
 *  2. useFiltrosControle — regras derivadas (consultorEfetivo, atendimentosPeriodo)
 *  3. Este hook — data fetching e lookup maps
 *
 * Nenhuma lógica de UI aqui.
 */
export default function useControleAceleracaoState() {
  // ── 1. URL state ──
  const urlState = useControleAceleracaoURLState();
  const { filtros, setFiltros, activeTab, setActiveTab, isModalOpen, atendimentoId, openModal, closeModal } = urlState;

  // ── 2. Auth ──
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  // ── 3. Shared reference data ──
  const { data: workshops } = useWorkshopsAtivos();
  const { data: consultores } = useConsultoresList(user);

  // ── 4. Filtros derivados (precisa de user para consultorEfetivo) ──
  //    Atendimentos query depende de consultorEfetivo, então compute primeiro com array vazio
  const { consultorEfetivo } = useFiltrosControle({ filtros, user, atendimentos: [] });

  // ── 5. Atendimentos — query única compartilhada ──
  const { data: atendimentos, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ["atendimentos-acelerador", user?.id, consultorEfetivo],
    queryFn: async () => {
      const query = {};
      if (consultorEfetivo) query.consultor_id = consultorEfetivo;
      return await base44.entities.ConsultoriaAtendimento.filter(query, "-data_agendada", 500);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // ── 6. Atendimentos filtrados por período (agora com dados reais) ──
  const { atendimentosPeriodo } = useFiltrosControle({
    filtros,
    user,
    atendimentos: atendimentos || [],
  });

  // ── 7. Meeting minutes ──
  const { data: atas } = useQuery({
    queryKey: ["meeting-minutes"],
    queryFn: () => base44.entities.MeetingMinutes.list("-created_date", 500),
    staleTime: 3 * 60 * 1000,
  });

  // ── 8. Lookup maps O(1) ──
  const workshopMap = useMemo(() => {
    const map = {};
    (workshops || []).forEach((w) => { map[w.id] = w; });
    return map;
  }, [workshops]);

  const atasMap = useMemo(() => {
    const map = {};
    (atas || []).forEach((a) => { map[a.id] = a; });
    return map;
  }, [atas]);

  // ── 9. Monthly plans ──
  const { data: planos } = useQuery({
    queryKey: ["planos-aceleracao"],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list("-created_date"),
    staleTime: 5 * 60 * 1000,
  });

  return {
    // Auth
    user,
    loadingUser,
    // URL-synced
    activeTab, setActiveTab,
    isModalOpen, atendimentoId, openModal, closeModal,
    // Filtros
    filtros, setFiltros, consultorEfetivo,
    // Data
    workshops: workshops || [],
    workshopMap,
    consultores: consultores || [],
    atendimentos: atendimentos || [],
    atendimentosPeriodo,
    loadingAtendimentos,
    atas: atas || [],
    atasMap,
    planos: planos || [],
  };
}
import { useMemo, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useWorkshopsAtivos from "./useWorkshopsAtivos";
import useConsultoresList from "./useConsultoresList";
import useControleAceleracaoURLState from "./useControleAceleracaoURLState";
import { getConsultorEfetivo, filterAtendimentosPeriodo } from "./useFiltrosControle";

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

  // ── 1b. Pending sub-tab (for cross-tab navigation, e.g. bucket card → atendimentos/bucket) ──
  const [pendingSubTab, setPendingSubTab] = useState(null);

  // ── 2. Auth — usa AuthContext em vez de query duplicada ──
  const { user, isLoadingAuth: loadingUser } = useAuth();

  // ── 3. Shared reference data ──
  const { data: workshops } = useWorkshopsAtivos();
  const { data: consultores } = useConsultoresList(user);

  // ── 4. Consultor efetivo (função pura, sem hook) ──
  const consultorEfetivo = useMemo(
    () => getConsultorEfetivo(filtros, user),
    [filtros.consultorId, user?.id, user?.role]
  );

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

  // ── 6. Atendimentos filtrados por período (função pura, sem hook) ──
  const atendimentosPeriodo = useMemo(
    () => filterAtendimentosPeriodo(atendimentos || [], filtros),
    [atendimentos, filtros.dataInicio, filtros.dataFim]
  );

  // ── 7. Meeting minutes ──
  const { data: atas } = useQuery({
    queryKey: ["meeting-minutes", consultorEfetivo],
    queryFn: () => {
      const filterQuery = {};
      if (consultorEfetivo) filterQuery.consultor_id = consultorEfetivo;
      return base44.entities.MeetingMinutes.filter(filterQuery, "-created_date", 200);
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!user?.id,
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
    enabled: !!user?.id,
  });

  // ── 10. Auto-mark atrasados (server-side, once per session) ──
  const queryClient = useQueryClient();
  const markAtrasadosRanRef = useRef(false);
  useEffect(() => {
    if (!user?.id || markAtrasadosRanRef.current) return;
    markAtrasadosRanRef.current = true;
    base44.functions.invoke('markAtrasados', {}).then((res) => {
      if (res.data?.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      }
    }).catch(() => { /* silent — non-critical */ });
  }, [user?.id]);

  return {
    // Auth
    user,
    loadingUser,
    // URL-synced
    activeTab, setActiveTab,
    pendingSubTab, setPendingSubTab,
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
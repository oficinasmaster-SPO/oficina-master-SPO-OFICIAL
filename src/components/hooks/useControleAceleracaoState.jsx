import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useConsultoresList from "./useConsultoresList";
import { useWorkshopContext } from "./useWorkshopContext";
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
  // DS-EMPTY-01: usar workshopsDisponiveis do BFF (asServiceRole) em vez de Workshop.filter com RLS
  // useWorkshopsAtivos usa base44.entities com RLS que pode retornar [] silenciosamente quando
  // consulting_firm_id dos workshops não bate com o do usuário.
  // workshopsDisponiveis vem de getUserWorkshops (asServiceRole) e retorna lista completa correta.
  const { workshopsDisponiveis } = useWorkshopContext();
  const workshops = workshopsDisponiveis || [];
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
    staleTime: 3 * 60 * 1000, // 3 min (foi 2 min)
    refetchOnWindowFocus: false, // evita refetch ao trocar de aba
    refetchOnMount: 'stale' // só refetch se dados estão stale
  });

  // ── 6. Atendimentos filtrados por período (função pura, sem hook) ──
  const atendimentosPeriodo = useMemo(
    () => filterAtendimentosPeriodo(atendimentos || [], filtros),
    [atendimentos, filtros.dataInicio, filtros.dataFim]
  );

  // ── 7. Meeting minutes — limitado aos últimos 90 dias ──
  const { data: atas } = useQuery({
    queryKey: ["meeting-minutes", consultorEfetivo],
    queryFn: () => {
      const filterQuery = {};
      if (consultorEfetivo) filterQuery.consultor_id = consultorEfetivo;
      return base44.entities.MeetingMinutes.filter(filterQuery, "-created_date", 100);
    },
    staleTime: 5 * 60 * 1000, // 5 min (foi 3 min)
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
    enabled: !!user?.id,
  });

  // ── 8. Lookup maps O(1) ──
  // Base map from workshopsDisponiveis
  const baseWorkshopMap = useMemo(() => {
    const map = {};
    (workshops || []).forEach((w) => { map[w.id] = w; });
    return map;
  }, [workshops]);

  // Detect missing workshop_ids from atendimentos (clients not in the base list)
  const missingWorkshopIds = useMemo(() => {
    if (!atendimentos?.length) return [];
    const missing = new Set();
    atendimentos.forEach(a => {
      if (a.workshop_id && !baseWorkshopMap[a.workshop_id]) {
        missing.add(a.workshop_id);
      }
    });
    return Array.from(missing);
  }, [atendimentos, baseWorkshopMap]);

  // ATEND-01 FIX-COMPLEMENTAR: UMA chamada batch em vez de N chamadas individuais (evita rate limit)
  const { data: missingWorkshops = [] } = useQuery({
    queryKey: ['workshops-missing', missingWorkshopIds.join(',')],
    queryFn: async () => {
      if (!missingWorkshopIds.length) return [];
      try {
        const response = await base44.functions.invoke('getUserWorkshops', {
          workshopIds: missingWorkshopIds
        });
        return response?.data?.workshops || [];
      } catch (err) {
        console.warn('[workshopMap] Falha ao buscar workshops faltantes:', err?.message);
        return [];
      }
    },
    enabled: missingWorkshopIds.length > 0,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 2000,
  });

  // PERF (2026-07-07): cache local de nomes de oficinas — nomes aparecem
  // instantaneamente enquanto os dados frescos carregam em background.
  const cachedNames = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('workshop-name-cache') || '{}'); }
    catch { return {}; }
  }, []);

  // Merge base + missing into final workshopMap (cache local como fallback imediato)
  const workshopMap = useMemo(() => {
    const map = {};
    // 1. Fallback: nomes do cache local (placeholder até dados frescos chegarem)
    Object.entries(cachedNames).forEach(([id, name]) => {
      map[id] = { id, name, _cached: true };
    });
    // 2. Dados frescos sobrescrevem o cache
    Object.assign(map, baseWorkshopMap);
    missingWorkshops.forEach(w => { if (w?.id) map[w.id] = w; });
    return map;
  }, [baseWorkshopMap, missingWorkshops, cachedNames]);

  // Persistir nomes resolvidos no cache local
  useEffect(() => {
    const fresh = [...(workshops || []), ...missingWorkshops];
    if (!fresh.length) return;
    try {
      const cache = JSON.parse(localStorage.getItem('workshop-name-cache') || '{}');
      let changed = false;
      fresh.forEach(w => {
        if (w?.id && w?.name && cache[w.id] !== w.name) { cache[w.id] = w.name; changed = true; }
      });
      if (changed) localStorage.setItem('workshop-name-cache', JSON.stringify(cache));
    } catch { /* storage indisponível — ignora */ }
  }, [workshops, missingWorkshops]);

  const atasMap = useMemo(() => {
    const map = {};
    (atas || []).forEach((a) => { map[a.id] = a; });
    return map;
  }, [atas]);

  // ── 9. Follow-up reminders (badge count no header) ──
  // Nota: a tab FollowUpsTab faz sua própria query completa (sem filtro de data)
  // Este query aqui serve apenas para o badge de "vencidos hoje" no estado global
  const { data: followUpRemindersVencidos } = useQuery({
    queryKey: ["follow-up-reminders-vencidos", consultorEfetivo],
    queryFn: async () => {
      const query = { is_completed: false };
      if (consultorEfetivo) query.consultor_id = consultorEfetivo;
      const today = new Date().toISOString().split('T')[0];
      const all = await base44.entities.FollowUpReminder.filter(query, "reminder_date", 100);
      return all.filter(r => r.reminder_date <= today);
    },
    staleTime: 8 * 60 * 1000, // 8 min (foi 5 min)
    refetchOnWindowFocus: false,
    refetchOnMount: 'stale',
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
    followUpRemindersVencidos: followUpRemindersVencidos || [],
    // planos removido — query desnecessária (P-001)
  };
}
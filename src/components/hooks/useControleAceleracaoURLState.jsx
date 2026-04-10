import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { computeDatesForPreset } from "@/utils/aceleracaoDates";

const VALID_TABS = [
  "visao-geral", "atendimentos", "cronograma",
  "pedidos", "agenda-visual", "dashboard-operacional"
];

const VALID_PRESETS = ["7d", "15d", "30d", "mes_atual", "custom"];

const DEFAULT_TAB = "visao-geral";

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
}



/**
 * Sincroniza estado da página /controleaceleracao com a URL.
 * A URL é a fonte de verdade — back/forward reconstrói o estado.
 *
 * Params sincronizados:
 *  tab, modal, atendimento_id, consultor, preset, de, ate
 */
export default function useControleAceleracaoURLState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Ler estado da URL ──
  const rawTab = searchParams.get("tab");
  const activeTab = useMemo(() => {
    // LEGADO (pré-2025): tab "consultoria" foi renomeada para "dashboard-operacional".
    // Mantido para não quebrar bookmarks/links antigos. Remover quando analytics
    // confirmarem que nenhum acesso usa ?tab=consultoria (avaliar em Jul/2026).
    if (rawTab === "consultoria") return "dashboard-operacional";
    if (rawTab && VALID_TABS.includes(rawTab)) return rawTab;
    return DEFAULT_TAB;
  }, [rawTab]);

  const isModalOpen = searchParams.get("modal") === "atendimento";
  const atendimentoId = searchParams.get("atendimento_id") || null;

  const filtros = useMemo(() => {
    const preset = VALID_PRESETS.includes(searchParams.get("preset")) ? searchParams.get("preset") : "mes_atual";
    const consultorId = searchParams.get("consultor") || "todos";

    if (preset === "custom") {
      const de = searchParams.get("de");
      const ate = searchParams.get("ate");
      const defaultDates = computeDatesForPreset("mes_atual");
      return {
        consultorId,
        preset: "custom",
        dataInicio: (de && isValidDate(de)) ? de : defaultDates.dataInicio,
        dataFim: (ate && isValidDate(ate)) ? ate : defaultDates.dataFim
      };
    }

    const { dataInicio, dataFim } = computeDatesForPreset(preset);
    return { consultorId, preset, dataInicio, dataFim };
  }, [searchParams]);

  // ── Helpers para atualizar a URL ──
  const updateParams = useCallback((updates, replace = false) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      return next;
    }, { replace });
  }, [setSearchParams]);

  const setActiveTab = useCallback((tab) => {
    if (!VALID_TABS.includes(tab)) return;
    updateParams({
      tab: tab === DEFAULT_TAB ? null : tab, // omit default
      modal: null, atendimento_id: null // clear modal on tab change
    }, false);
  }, [updateParams]);

  const setFiltros = useCallback((newFiltros) => {
    const { consultorId, preset, dataInicio, dataFim } = newFiltros;
    const updates = {
      consultor: consultorId === "todos" ? null : consultorId,
      preset: preset === "mes_atual" ? null : preset
    };
    if (preset === "custom") {
      updates.de = dataInicio || null;
      updates.ate = dataFim || null;
    } else {
      updates.de = null;
      updates.ate = null;
    }
    updateParams(updates, true);
  }, [updateParams]);

  const openModal = useCallback((atendimentoId) => {
    const updates = { modal: "atendimento" };
    if (atendimentoId) updates.atendimento_id = atendimentoId;
    updateParams(updates, false);
  }, [updateParams]);

  const closeModal = useCallback(() => {
    updateParams({ modal: null, atendimento_id: null, edit: null }, false);
  }, [updateParams]);

  return {
    activeTab,
    setActiveTab,
    isModalOpen,
    atendimentoId,
    filtros,
    setFiltros,
    openModal,
    closeModal,
    updateParams
  };
}
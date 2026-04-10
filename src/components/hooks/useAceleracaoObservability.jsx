import { useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Observability hook for /controleaceleracao page.
 * Tracks: page load performance, tab switches, filter usage, atendimento creation, errors.
 */
export function useAceleracaoObservability(user) {
  const pageLoadTime = useRef(performance.now());
  const tabSwitchCount = useRef(0);
  const pageLoadTracked = useRef(false);

  // Track page load performance — waits for user to be loaded
  useEffect(() => {
    if (!user?.role || pageLoadTracked.current) return;
    pageLoadTracked.current = true;

    const loadDuration = Math.round(performance.now() - pageLoadTime.current);
    base44.analytics.track({
      eventName: "aceleracao_page_loaded",
      properties: {
        load_duration_ms: loadDuration,
        user_role: user.role,
      },
    });
  }, [user?.role]);

  // Track session duration on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = Math.round((performance.now() - pageLoadTime.current) / 1000);
      base44.analytics.track({
        eventName: "aceleracao_session_ended",
        properties: {
          duration_seconds: sessionDuration,
          tab_switches: tabSwitchCount.current,
        },
      });
    };
  }, []);

  // Track tab change
  const trackTabChange = useCallback((fromTab, toTab) => {
    tabSwitchCount.current += 1;
    base44.analytics.track({
      eventName: "aceleracao_tab_changed",
      properties: {
        from_tab: fromTab,
        to_tab: toTab,
        switch_count: tabSwitchCount.current,
      },
    });
  }, []);

  // Track filter usage
  const trackFilterChange = useCallback((filtros) => {
    base44.analytics.track({
      eventName: "aceleracao_filter_applied",
      properties: {
        consultor_id: filtros.consultorId || "todos",
        preset: filtros.preset || "custom",
        data_inicio: filtros.dataInicio || null,
        data_fim: filtros.dataFim || null,
      },
    });
  }, []);

  // Track atendimento creation
  const trackAtendimentoOpen = useCallback((atendimentoId) => {
    base44.analytics.track({
      eventName: "aceleracao_atendimento_opened",
      properties: {
        is_new: !atendimentoId,
        atendimento_id: atendimentoId || null,
      },
    });
  }, []);

  // Track mass registration open
  const trackMassRegistrationOpen = useCallback(() => {
    base44.analytics.track({
      eventName: "aceleracao_mass_registration_opened",
      properties: { success: true },
    });
  }, []);

  // Track errors
  const trackError = useCallback((errorContext, error) => {
    console.error(`[Aceleracao] ${errorContext}:`, error);
    base44.analytics.track({
      eventName: "aceleracao_error",
      properties: {
        context: errorContext,
        message: error?.message || String(error),
      },
    });
  }, []);

  return {
    trackTabChange,
    trackFilterChange,
    trackAtendimentoOpen,
    trackMassRegistrationOpen,
    trackError,
  };
}
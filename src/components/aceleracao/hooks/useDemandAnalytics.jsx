import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para logging de eventos de demandas paralelas
 * Envia eventos para função de analytics
 */
export function useDemandAnalytics() {
  const logEvent = useCallback(async (eventType, data) => {
    try {
      await base44.functions.invoke('logDemandAnalytics', {
        eventType,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
    } catch (error) {
      console.warn('Failed to log demand analytics:', error);
      // Não falha a app se analytics falhar
    }
  }, []);

  const logAlertShown = useCallback((demand) => {
    logEvent('demand_alert_shown', {
      type: demand.demandType,
      severity: demand.severity,
      demandId: demand.id,
      title: demand.title
    });
  }, [logEvent]);

  const logDemandClicked = useCallback((demandType, demandId) => {
    logEvent('demand_clicked', {
      type: demandType,
      demandId
    });
  }, [logEvent]);

  const logCheckpointDecision = useCallback((decision, metadata) => {
    logEvent('checkpoint_decision_made', {
      decision,
      date: metadata.date,
      followUpId: metadata.followUpId,
      miniFollowUpId: metadata.miniFollowUpId
    });
  }, [logEvent]);

  return {
    logAlertShown,
    logDemandClicked,
    logCheckpointDecision
  };
}
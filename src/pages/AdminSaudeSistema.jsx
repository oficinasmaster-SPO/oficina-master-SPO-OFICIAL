import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import HealthStatusCard from "@/components/admin/health/HealthStatusCard";
import ExecutiveSummaryBlock from "@/components/admin/health/ExecutiveSummaryBlock";
import IdentityProvisioningBlock from "@/components/admin/health/IdentityProvisioningBlock";
import DataQualityBlock from "@/components/admin/health/DataQualityBlock";
import RBACHealthBlock from "@/components/admin/health/RBACHealthBlock";
import OnboardingHealthBlock from "@/components/admin/health/OnboardingHealthBlock";
import RecoveryBlock from "@/components/admin/health/RecoveryBlock";
import AutomationsBlock from "@/components/admin/health/AutomationsBlock";
import LegacyBlock from "@/components/admin/health/LegacyBlock";
import ObservabilityBlock from "@/components/admin/health/ObservabilityBlock";
import HealthTrendBlock from "@/components/admin/health/HealthTrendBlock";
import TimelineBlock from "@/components/admin/health/TimelineBlock";
import ScoreBreakdownBlock from "@/components/admin/health/ScoreBreakdownBlock";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export default function AdminSaudeSistema() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("systemHealthDashboard", {});
      setData(res.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Erro ao buscar saúde do sistema:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saúde do Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Centro de Operações · Governança, RBAC, Identidade, Qualidade, Observabilidade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Atualizado às {formatTime(lastUpdated)}</span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Carregando dados do sistema...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* 1. RESUMO EXECUTIVO */}
          <ExecutiveSummaryBlock data={data} />

          {/* 2. STATUS GERAL */}
          <HealthStatusCard data={data} />

          {/* 3. IDENTIDADE + QUALIDADE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IdentityProvisioningBlock data={data} />
            <DataQualityBlock data={data} />
          </div>

          {/* 4. RBAC + ONBOARDING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RBACHealthBlock data={data} />
            <OnboardingHealthBlock data={data} />
          </div>

          {/* 5. RECOVERY + AUTOMAÇÕES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecoveryBlock data={data} />
            <AutomationsBlock data={data} />
          </div>

          {/* 6. LEGACY + OBSERVABILIDADE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LegacyBlock data={data} />
            <ObservabilityBlock data={data} />
          </div>

          {/* 7. TENDÊNCIA + TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthTrendBlock data={data} />
            <TimelineBlock data={data} />
          </div>

          {/* 8. SCORE BREAKDOWN */}
          <ScoreBreakdownBlock data={data} />

        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          Não foi possível carregar os dados.
        </div>
      )}
    </div>
  );
}
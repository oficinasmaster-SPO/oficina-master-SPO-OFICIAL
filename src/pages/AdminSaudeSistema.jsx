import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";

// Camada 1 — Executive Summary
import ExecutiveSummaryBlock from "@/components/admin/health/ExecutiveSummaryBlock";
import HealthStatusCard from "@/components/admin/health/HealthStatusCard";

// Camada 2 — Problemas Críticos
import CriticalIssuesBlock from "@/components/admin/health/CriticalIssuesBlock";

// Camada 3 — Governança
import DataQualityBlock from "@/components/admin/health/DataQualityBlock";
import RBACHealthBlock from "@/components/admin/health/RBACHealthBlock";

// Camada 4 — Onboarding / Identidade
import IdentityProvisioningBlock from "@/components/admin/health/IdentityProvisioningBlock";
import OnboardingHealthBlock from "@/components/admin/health/OnboardingHealthBlock";

// Camada 5 — Recovery
import RecoveryBlock from "@/components/admin/health/RecoveryBlock";

// Camada 6 — Automações
import AutomationsBlock from "@/components/admin/health/AutomationsBlock";

// Camada 7 — Legado
import LegacyBlock from "@/components/admin/health/LegacyBlock";

// Camada 8 — Observabilidade
import ObservabilityBlock from "@/components/admin/health/ObservabilityBlock";

// Camada 9 — Tendências
import HealthTrendBlock from "@/components/admin/health/HealthTrendBlock";

// Camada 10 — Timeline
import TimelineBlock from "@/components/admin/health/TimelineBlock";

// Score breakdown
import ScoreBreakdownBlock from "@/components/admin/health/ScoreBreakdownBlock";

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function SectionLabel({ number, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</span>
    </div>
  );
}

export default function AdminSaudeSistema() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saúde do Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Centro de Operações · Governança · RBAC · Identidade · Observabilidade
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Atualizado às {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
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
      ) : !data ? (
        <div className="text-center py-16 text-gray-400">
          Não foi possível carregar os dados.
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── CAMADA 1: EXECUTIVE SUMMARY ── */}
          <section>
            <SectionLabel number="1" title="Executive Summary" />
            <div className="space-y-3">
              <ExecutiveSummaryBlock data={data} />
              <HealthStatusCard data={data} />
            </div>
          </section>

          {/* ── CAMADA 2: PROBLEMAS CRÍTICOS ── */}
          <section>
            <SectionLabel number="2" title="Problemas Críticos" />
            <CriticalIssuesBlock data={data} />
          </section>

          {/* ── CAMADA 3: GOVERNANÇA ── */}
          <section>
            <SectionLabel number="3" title="Governança" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataQualityBlock data={data} />
              <RBACHealthBlock data={data} />
            </div>
          </section>

          {/* ── CAMADA 4: ONBOARDING / IDENTIDADE ── */}
          <section>
            <SectionLabel number="4" title="Onboarding & Identidade" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IdentityProvisioningBlock data={data} />
              <OnboardingHealthBlock data={data} />
            </div>
          </section>

          {/* ── CAMADA 5: RECOVERY ── */}
          <section>
            <SectionLabel number="5" title="Recovery" />
            <RecoveryBlock data={data} />
          </section>

          {/* ── CAMADA 6: AUTOMAÇÕES ── */}
          <section>
            <SectionLabel number="6" title="Automações" />
            <AutomationsBlock data={data} user={currentUser} />
          </section>

          {/* ── CAMADA 7: LEGADO ── */}
          <section>
            <SectionLabel number="7" title="Endpoints Legados" />
            <LegacyBlock data={data} />
          </section>

          {/* ── CAMADA 8: OBSERVABILIDADE ── */}
          <section>
            <SectionLabel number="8" title="Observabilidade" />
            <ObservabilityBlock data={data} />
          </section>

          {/* ── CAMADA 9: TENDÊNCIAS ── */}
          <section>
            <SectionLabel number="9" title="Tendências" />
            <HealthTrendBlock data={data} />
          </section>

          {/* ── CAMADA 10: TIMELINE ── */}
          <section>
            <SectionLabel number="10" title="Timeline Global" />
            <TimelineBlock data={data} />
          </section>

          {/* ── SCORE BREAKDOWN ── */}
          <section>
            <SectionLabel number="★" title="Score Breakdown" />
            <ScoreBreakdownBlock data={data} />
          </section>

        </div>
      )}
    </div>
  );
}
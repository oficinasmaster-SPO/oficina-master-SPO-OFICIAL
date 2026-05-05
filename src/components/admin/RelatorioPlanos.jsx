import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3, RefreshCw, ChevronDown, ChevronRight, Building2 } from "lucide-react";

const PLAN_COLORS = {
  FREE: "bg-gray-100 text-gray-700",
  START: "bg-blue-100 text-blue-700",
  BRONZE: "bg-orange-100 text-orange-700",
  PRATA: "bg-slate-100 text-slate-700",
  GOLD: "bg-yellow-100 text-yellow-800",
  IOM: "bg-purple-100 text-purple-700",
  MILLIONS: "bg-green-100 text-green-700",
};

export default function RelatorioPlanos({ open, onClose }) {
  const [expandedPlan, setExpandedPlan] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["relatorio-planos"],
    queryFn: async () => {
      const res = await base44.functions.invoke("adminRelatorioPlanos", {});
      return res.data;
    },
    enabled: open,
    staleTime: 2 * 60 * 1000,
  });

  // A função retorna: total, porPlano, porPlanStatus, porStatusOficina, detalhes
  const metrics = {
    total: data?.total || 0,
    active: data?.porStatusOficina?.ativo || 0,
    inactive: data?.porStatusOficina?.inativo || 0,
    paying: Object.entries(data?.porPlano || {}).filter(([plan]) => plan !== "FREE").reduce((sum, [, c]) => sum + c, 0),
    by_plan_status: data?.porPlanStatus || {},
  };
  const byPlan = data?.detalhes || {};
  const plans = Object.keys(byPlan);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Relatório de Planos
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{metrics.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total de Oficinas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{metrics.active || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Ativas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{metrics.paying || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Pagantes (não FREE)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{metrics.inactive || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Inativas</p>
                </CardContent>
              </Card>
            </div>

            {/* Distribuição por Status de Assinatura */}
            {metrics.by_plan_status && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Por Status de Assinatura</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.by_plan_status).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-sm px-3 py-1">
                      {status}: <span className="font-bold ml-1">{count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Lista por Plano */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Oficinas por Plano</h3>
              {plans.map((plan) => {
                const group = byPlan[plan]; // array de oficinas
                const count = Array.isArray(group) ? group.length : 0;
                const isExpanded = expandedPlan === plan;
                // Calcular contagem por statusOficina
                const byStatus = Array.isArray(group) ? group.reduce((acc, ws) => {
                  const st = ws.statusOficina || "ativo";
                  acc[st] = (acc[st] || 0) + 1;
                  return acc;
                }, {}) : {};
                return (
                  <div key={plan} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => setExpandedPlan(isExpanded ? null : plan)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={PLAN_COLORS[plan] || "bg-gray-100 text-gray-700"}>
                          {plan}
                        </Badge>
                        <span className="text-sm font-medium text-gray-700">
                          {count} oficina{count !== 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-1">
                          {Object.entries(byStatus).map(([st, ct]) => (
                            <span key={st} className={`text-[11px] px-1.5 py-0.5 rounded ${
                              st === "ativo" ? "bg-green-100 text-green-700" :
                              st === "inativo" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {st}: {ct}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>

                    {isExpanded && group?.length > 0 && (
                      <div className="divide-y divide-gray-100">
                        {group.map((ws) => (
                          <div key={ws.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{ws.nome || ws.name}</p>
                                {(ws.cidade || ws.estado) && (
                                  <p className="text-xs text-gray-500">{[ws.cidade, ws.estado].filter(Boolean).join(" - ")}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <Badge className={
                                ws.statusOficina === "ativo" ? "bg-green-100 text-green-700" :
                                ws.statusOficina === "inativo" ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              } variant="outline">
                                {ws.statusOficina || "—"}
                              </Badge>
                              {ws.planStatus && (
                                <span className="text-[11px] text-gray-400">{ws.planStatus}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {data?.generated_at && (
              <p className="text-xs text-gray-400 text-right">
                Gerado em: {new Date(data.generated_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
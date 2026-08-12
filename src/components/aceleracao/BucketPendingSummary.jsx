import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Layers, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PLAN_ORDER = ["MILLIONS", "IOM", "GOLD", "PRATA", "BRONZE", "START", "FREE"];

export default function BucketPendingSummary({ items, workshopMap }) {
  const [open, setOpen] = useState(false);

  const { byPlan, byWorkshop } = useMemo(() => {
    const planCounts = {};
    const wsCounts = {};
    for (const it of items || []) {
      const p = it.plan_id || "SEM_PLANO";
      planCounts[p] = (planCounts[p] || 0) + 1;
      const wid = it.workshop_id;
      if (wid) {
        wsCounts[wid] = (wsCounts[wid] || 0) + 1;
      }
    }
    const planArr = Object.entries(planCounts)
      .sort(([a], [b]) => {
        const ia = PLAN_ORDER.indexOf(a);
        const ib = PLAN_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([plan, count]) => ({ plan, count }));
    const wsArr = Object.entries(wsCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([workshop_id, count]) => ({
        workshop_id,
        name: workshopMap?.[workshop_id]?.name || "Oficina",
        count
      }));
    return { byPlan: planArr, byWorkshop: wsArr };
  }, [items, workshopMap]);

  if (!items || items.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Distribuição de pendentes (somente leitura)
        </span>
        <span className="text-xs text-gray-400">{byPlan.length} planos · {byWorkshop.length} oficinas</span>
      </button>
      {open && (
        <div className="px-3 pb-3 grid md:grid-cols-2 gap-3">
          <div className="bg-white rounded-md border border-gray-100 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Por plano
            </p>
            <div className="space-y-1">
              {byPlan.map(({ plan, count }) => (
                <div key={plan} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{plan}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-md border border-gray-100 p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Top 10 oficinas
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
              {byWorkshop.map(({ workshop_id, name, count }) => (
                <div key={workshop_id} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-gray-700 truncate">{name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
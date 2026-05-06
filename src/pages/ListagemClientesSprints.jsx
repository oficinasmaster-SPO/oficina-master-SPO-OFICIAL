import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Zap, Users, AlertTriangle, Clock, Check, Send,
  Search, RefreshCw, Activity, ChevronDown, ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  in_progress: { label: "Em execução", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  pending:     { label: "Pendente",    color: "bg-gray-100 text-gray-600",  dot: "bg-gray-400" },
  overdue:     { label: "Atrasado",    color: "bg-red-100 text-red-700",    dot: "bg-red-500" },
  completed:   { label: "Concluído",   color: "bg-green-100 text-green-700",dot: "bg-green-500" },
  pending_review: { label: "Revisão",  color: "bg-amber-100 text-amber-700",dot: "bg-amber-500" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ProgressBar({ value, color = "bg-blue-500" }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ icon: IconComp, label, value, color, bg }) {
  return (
    <div className={`flex items-center gap-3 ${bg} rounded-xl px-5 py-4 border border-transparent`}>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        <IconComp className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── hook de dados ─────────────────────────────────────────────────────────────

function useClienteSprints() {
  const { data: workshops = [], isLoading: loadingWS } = useQuery({
    queryKey: ["workshops-listagem"],
    queryFn: () => base44.asServiceRole?.entities?.Workshop?.list?.() ?? base44.entities.Workshop.list(),
    staleTime: 5 * 60 * 1000,
  });

  const workshopMap = useMemo(
    () => Object.fromEntries(workshops.map(w => [w.id, w])),
    [workshops]
  );

  const ids = useMemo(() => workshops.map(w => w.id), [workshops]);
  const idsKey = ids.join(",");

  const { data: sprints = [], isLoading: loadingSprints, refetch } = useQuery({
    queryKey: ["listagem-sprints", idsKey],
    queryFn: async () => {
      if (!ids.length) return [];
      const batchSize = 8;
      const all = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(id =>
            base44.entities.ConsultoriaSprint.filter({ workshop_id: id }).catch(() => [])
          )
        );
        results.forEach(arr => Array.isArray(arr) && all.push(...arr));
        if (i + batchSize < ids.length) await new Promise(r => setTimeout(r, 150));
      }
      return all;
    },
    enabled: ids.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  // Agrupar sprints por cliente
  const clientesSprints = useMemo(() => {
    const map = new Map();
    sprints.forEach(s => {
      if (!s.workshop_id) return;
      if (!map.has(s.workshop_id)) map.set(s.workshop_id, []);
      map.get(s.workshop_id).push(s);
    });

    return Array.from(map.entries()).map(([wsId, wsSprints]) => {
      const workshop = workshopMap[wsId] || { id: wsId, name: `Oficina ${wsId.slice(0, 8)}...` };
      const hasOverdue = wsSprints.some(s => s.status === "overdue");
      const hasInProgress = wsSprints.some(s => s.status === "in_progress");
      const pendingCount = wsSprints.filter(s => s.status === "pending").length;
      const avgProgress = Math.round(wsSprints.reduce((a, s) => a + (s.progress_percentage || 0), 0) / wsSprints.length);
      const pendingReviewCount = wsSprints.filter(s =>
        (s.phases || []).some(p => p.status === "pending_review")
      ).length;
      return { workshop, sprints: wsSprints, hasOverdue, hasInProgress, pendingCount, avgProgress, pendingReviewCount };
    }).sort((a, b) => {
      // Prioridade: overdue > in_progress > pending
      if (a.hasOverdue !== b.hasOverdue) return a.hasOverdue ? -1 : 1;
      if (a.hasInProgress !== b.hasInProgress) return a.hasInProgress ? -1 : 1;
      return b.sprints.length - a.sprints.length;
    });
  }, [sprints, workshopMap]);

  const stats = useMemo(() => ({
    totalClientes: clientesSprints.length,
    comTrilha: clientesSprints.length,
    emExecucao: sprints.filter(s => s.status === "in_progress").length,
    pendentes: sprints.filter(s => s.status === "pending").length,
    atrasados: sprints.filter(s => s.status === "overdue").length,
    revisao: sprints.filter(s => (s.phases || []).some(p => p.status === "pending_review")).length,
    concluidos: sprints.filter(s => s.status === "completed").length,
  }), [clientesSprints, sprints]);

  return { clientesSprints, stats, isLoading: loadingWS || loadingSprints, refetch };
}

// ─── linha expandível de cliente ──────────────────────────────────────────────

function ClienteRow({ cliente }) {
  const [expanded, setExpanded] = useState(false);
  const { workshop, sprints, hasOverdue, hasInProgress, pendingCount, avgProgress, pendingReviewCount } = cliente;

  const progressColor = avgProgress >= 70 ? "bg-green-500" : avgProgress >= 40 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${hasOverdue ? "border-red-200" : "border-gray-200"} bg-white`}>
      {/* Header da linha */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Indicador de status */}
        <div className={`w-2 h-10 rounded-full flex-shrink-0 ${hasOverdue ? "bg-red-500" : hasInProgress ? "bg-blue-500" : "bg-gray-300"}`} />

        {/* Nome + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{workshop.name}</p>
            {hasOverdue && <Badge className="bg-red-100 text-red-700 text-[10px]">⚠ Atrasado</Badge>}
            {pendingReviewCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Send className="w-2.5 h-2.5 mr-0.5" />{pendingReviewCount} revisão</Badge>}
            {pendingCount > 0 && <Badge className="bg-gray-100 text-gray-600 text-[10px]">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{workshop.city}{workshop.state ? `, ${workshop.state}` : ""}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-400">{sprints.length} sprint{sprints.length > 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Progresso médio */}
        <div className="w-24 hidden sm:block">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Progresso</span>
            <span className="font-bold text-gray-700">{avgProgress}%</span>
          </div>
          <ProgressBar value={avgProgress} color={progressColor} />
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Sprints expandidos */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
          {sprints.map(sprint => {
            const hasPendingReview = (sprint.phases || []).some(p => p.status === "pending_review");
            const daysRemaining = sprint.end_date ? differenceInDays(new Date(sprint.end_date), new Date()) : null;
            const isAtRisk = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const prog = sprint.progress_percentage || 0;

            return (
              <div key={sprint.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_META[sprint.status]?.dot || "bg-gray-400"}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 truncate">{sprint.title}</p>
                    <StatusBadge status={hasPendingReview ? "pending_review" : sprint.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {sprint.mission_id && (
                      <span className="text-xs text-gray-400 capitalize">{sprint.mission_id.replace(/_/g, " ")}</span>
                    )}
                    {daysRemaining !== null && (
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600 font-semibold" : isAtRisk ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                        <Clock className="w-3 h-3" />
                        {isOverdue
                          ? `${Math.abs(daysRemaining)}d atrasado`
                          : daysRemaining === 0
                          ? "Vence hoje"
                          : `${daysRemaining}d restantes`
                        }
                      </span>
                    )}
                  </div>
                </div>

                {/* Progresso */}
                <div className="w-20 hidden md:block">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 text-[10px]">Prog.</span>
                    <span className="font-bold text-gray-700 text-[10px]">{prog}%</span>
                  </div>
                  <ProgressBar value={prog} color={prog >= 70 ? "bg-green-500" : prog >= 40 ? "bg-blue-500" : "bg-amber-500"} />
                </div>

                {/* Data */}
                {sprint.end_date && (
                  <div className="text-xs text-gray-400 hidden lg:block flex-shrink-0">
                    Até {format(new Date(sprint.end_date), "dd/MM/yy", { locale: ptBR })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── filtro de categoria ──────────────────────────────────────────────────────

const FILTROS = [
  { id: "todos",       label: "Todos" },
  { id: "em_execucao", label: "Em execução" },
  { id: "pendente",    label: "Pendentes" },
  { id: "atrasado",    label: "Atrasados" },
  { id: "revisao",     label: "Para revisar" },
  { id: "concluido",   label: "Concluídos" },
];

// ─── página principal ─────────────────────────────────────────────────────────

export default function ListagemClientesSprints() {
  const { clientesSprints, stats, isLoading, refetch } = useClienteSprints();
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["listagem-sprints"] });
    queryClient.invalidateQueries({ queryKey: ["workshops-listagem"] });
    refetch();
  };

  const clientesFiltrados = useMemo(() => {
    let list = clientesSprints;

    // Filtro de busca
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.workshop.name?.toLowerCase().includes(q) ||
        c.workshop.city?.toLowerCase().includes(q)
      );
    }

    // Filtro de status
    if (filtro !== "todos") {
      list = list.filter(c => {
        if (filtro === "em_execucao") return c.hasInProgress;
        if (filtro === "pendente")    return c.pendingCount > 0;
        if (filtro === "atrasado")    return c.hasOverdue;
        if (filtro === "revisao")     return c.pendingReviewCount > 0;
        if (filtro === "concluido")   return c.sprints.every(s => s.status === "completed");
        return true;
      });
    }

    return list;
  }, [clientesSprints, search, filtro]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes com Sprints</h1>
          <p className="text-sm text-gray-500 mt-1">Visão consolidada de trilhas, sprints ativos e pendências</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users}         label="Clientes c/ trilha"  value={stats.comTrilha}    color="text-gray-700"   bg="bg-gray-50" />
        <StatCard icon={Zap}           label="Em execução"          value={stats.emExecucao}   color="text-blue-600"   bg="bg-blue-50" />
        <StatCard icon={Clock}         label="Pendentes"            value={stats.pendentes}    color="text-gray-500"   bg="bg-gray-50" />
        <StatCard icon={AlertTriangle} label="Atrasados"            value={stats.atrasados}    color="text-red-600"    bg="bg-red-50" />
        <StatCard icon={Send}          label="Para revisar"         value={stats.revisao}      color="text-amber-600"  bg="bg-amber-50" />
        <StatCard icon={Check}         label="Concluídos"           value={stats.concluidos}   color="text-green-600"  bg="bg-green-50" />
      </div>

      {/* Filtros + busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                filtro === f.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {f.label}
              {f.id === "atrasado" && stats.atrasados > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.atrasados}
                </span>
              )}
              {f.id === "revisao" && stats.revisao > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.revisao}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de clientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-400">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Tente ajustar o filtro ou a busca</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">
            {clientesFiltrados.length} cliente{clientesFiltrados.length > 1 ? "s" : ""}
            {filtro !== "todos" ? ` (filtrado: ${FILTROS.find(f => f.id === filtro)?.label})` : ""}
          </p>
          {clientesFiltrados.map(cliente => (
            <ClienteRow key={cliente.workshop.id} cliente={cliente} />
          ))}
        </div>
      )}
    </div>
  );
}
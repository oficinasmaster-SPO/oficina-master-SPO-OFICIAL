import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2, Clock, AlertTriangle, Activity, Filter,
  RefreshCw, ListChecks, TrendingUp, Users, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProximoPassoModal from "@/components/proximospassos/ProximoPassoModal";

const STATUS_CONFIG = {
  pendente:             { label: "Pendente",            color: "bg-gray-100 text-gray-700",    dot: "bg-gray-400" },
  em_andamento:         { label: "Em andamento",        color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  aguardando_cliente:   { label: "Ag. Cliente",         color: "bg-yellow-100 text-yellow-700",dot: "bg-yellow-500" },
  aguardando_consultor: { label: "Ag. Consultor",       color: "bg-purple-100 text-purple-700",dot: "bg-purple-500" },
  validacao:            { label: "Validação",           color: "bg-indigo-100 text-indigo-700",dot: "bg-indigo-500" },
  finalizado:           { label: "Finalizado",          color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  atrasado:             { label: "Atrasado",            color: "bg-red-100 text-red-700",      dot: "bg-red-500" },
  cancelado:            { label: "Cancelado",           color: "bg-gray-100 text-gray-400",    dot: "bg-gray-300" },
};

const PRIORIDADE_CONFIG = {
  baixa:   { label: "Baixa",    color: "text-gray-500" },
  media:   { label: "Média",    color: "text-blue-600" },
  alta:    { label: "Alta",     color: "text-orange-600" },
  critica: { label: "Crítica",  color: "text-red-600" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const color = pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-gray-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function CentralProximosPassos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPasso, setSelectedPasso] = useState(null);
  const [filters, setFilters] = useState({ status: "todos", prioridade: "todas" });
  const [textFilters, setTextFilters] = useState({
    acao: "",
    responsavel: "",
    cliente: ""
  });

  const consultingFirmId = user?.data?.consulting_firm_id;
  const isAdmin = user?.role === "admin";
  const isInternal = user?.user_type === "internal" || user?.data?.user_type === "internal" || user?.is_internal === true;

  const { data: passos = [], isLoading, refetch } = useQuery({
    queryKey: ["central-proximos-passos", consultingFirmId, isAdmin],
    queryFn: async () => {
      if (isAdmin || isInternal) {
        return base44.entities.ConsultoriaProximoPasso.filter({}, "-created_date", 500);
      }
      if (consultingFirmId) {
        return base44.entities.ConsultoriaProximoPasso.filter(
          { consulting_firm_id: consultingFirmId },
          "-created_date",
          500
        );
      }
      return [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // Buscar nomes dos workshops referenciados
  const workshopIds = useMemo(() => [...new Set(passos.map(p => p.workshop_id).filter(Boolean))], [passos]);
  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-proximos-passos", workshopIds.join(",")],
    queryFn: () => Promise.all(workshopIds.map(id => base44.entities.Workshop.get(id))).then(ws => ws.filter(Boolean)),
    enabled: workshopIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const workshopMap = useMemo(() => Object.fromEntries(workshops.map(w => [w.id, w.name])), [workshops]);

  const filtered = useMemo(() => {
    const now = new Date();
    
    return passos
      .filter(p => {
        const statusOk = filters.status === "todos" || p.status === filters.status;
        const prioOk = filters.prioridade === "todas" || p.prioridade === filters.prioridade;
        
        // Filtros de texto (case-insensitive, partial match)
        const acaoOk = !textFilters.acao || 
          p.titulo?.toLowerCase().includes(textFilters.acao.toLowerCase());
        
        const respOk = !textFilters.responsavel || 
          p.responsavel_nome?.toLowerCase().includes(textFilters.responsavel.toLowerCase());
        
        const clienteOk = !textFilters.cliente || 
          workshopMap[p.workshop_id]?.toLowerCase().includes(textFilters.cliente.toLowerCase());
        
        return statusOk && prioOk && acaoOk && respOk && clienteOk;
      })
      .sort((a, b) => {
        const prazoA = a.prazo ? new Date(a.prazo) : null;
        const prazoB = b.prazo ? new Date(b.prazo) : null;
        
        // Finalizados sempre por último
        if (a.status === "finalizado" && b.status !== "finalizado") return 1;
        if (b.status === "finalizado" && a.status !== "finalizado") return -1;
        
        // Atrasados em primeiro
        const isAtrasoA = prazoA && prazoA < now && a.status !== "finalizado" && a.status !== "cancelado";
        const isAtrasoB = prazoB && prazoB < now && b.status !== "finalizado" && b.status !== "cancelado";
        if (isAtrasoA && !isAtrasoB) return -1;
        if (!isAtrasoA && isAtrasoB) return 1;
        
        // Depois por prazo (mais próximo primeiro)
        if (prazoA && prazoB) return prazoA - prazoB;
        if (prazoA) return -1;
        if (prazoB) return 1;
        
        return 0;
      });
  }, [passos, filters, textFilters, workshopMap]);

  const stats = {
    total: passos.length,
    atrasados: passos.filter(p => p.status === "atrasado").length,
    finalizados: passos.filter(p => p.status === "finalizado").length,
    em_andamento: passos.filter(p => p.status === "em_andamento").length,
  };

  const handleSaved = () => {
    setSelectedPasso(null);
    queryClient.invalidateQueries({ queryKey: ["central-proximos-passos"] });
  };

  if (!isAdmin && !isInternal && !consultingFirmId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Users className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Acesso restrito a consultores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600" />
            Central de Próximos Passos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão operacional de execução e cobrança</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Activity}      label="Total"       value={stats.total}        color="bg-gray-100 text-gray-600" />
        <StatCard icon={TrendingUp}    label="Em andamento" value={stats.em_andamento} color="bg-blue-100 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Atrasados"   value={stats.atrasados}    color="bg-red-100 text-red-600" />
        <StatCard icon={CheckCircle2}  label="Finalizados" value={stats.finalizados}   color="bg-green-100 text-green-600" />
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        
        {/* Status */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Status</label>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="todos">Todos</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Prioridade */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Prioridade</label>
          <select
            value={filters.prioridade}
            onChange={e => setFilters(f => ({ ...f, prioridade: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="todas">Todas</option>
            {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Buscar por Ação */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Ação</label>
          <input
            type="text"
            placeholder="Buscar por ação..."
            value={textFilters.acao}
            onChange={e => setTextFilters(f => ({ ...f, acao: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {textFilters.acao && (
            <button
              onClick={() => setTextFilters(f => ({ ...f, acao: "" }))}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Buscar por Responsável */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Responsável</label>
          <input
            type="text"
            placeholder="Buscar por responsável..."
            value={textFilters.responsavel}
            onChange={e => setTextFilters(f => ({ ...f, responsavel: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {textFilters.responsavel && (
            <button
              onClick={() => setTextFilters(f => ({ ...f, responsavel: "" }))}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Buscar por Cliente */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Cliente</label>
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={textFilters.cliente}
            onChange={e => setTextFilters(f => ({ ...f, cliente: e.target.value }))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {textFilters.cliente && (
            <button
              onClick={() => setTextFilters(f => ({ ...f, cliente: "" }))}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Limpar Filtros */}
        {(filters.status !== "todos" || filters.prioridade !== "todas" || textFilters.acao || textFilters.responsavel || textFilters.cliente) && (
          <button
            onClick={() => {
              setFilters({ status: "todos", prioridade: "todas" });
              setTextFilters({ acao: "", responsavel: "", cliente: "" });
            }}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
        
        <span className="ml-auto text-xs text-gray-400">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <ListChecks className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum próximo passo encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Os itens aparecem aqui ao salvar ATAs com próximos passos</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header da tabela */}
          <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Ação / Cliente</span>
            <span>Responsável</span>
            <span>Prazo</span>
            <span>Status</span>
            <span>Progresso</span>
            <span>Prioridade</span>
            <span></span>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map(passo => {
              const prazoDate = passo.prazo ? new Date(passo.prazo) : null;
              const isOverdue = prazoDate && isPast(prazoDate) && passo.status !== "finalizado" && passo.status !== "cancelado";
              const isToday_ = prazoDate && isToday(prazoDate);

              return (
                <div
                  key={passo.id}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedPasso(passo)}
                >
                  {/* Título + cliente */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{passo.titulo}</p>
                    {passo.workshop_id && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {workshopMap[passo.workshop_id] || `ID: ${passo.workshop_id.slice(0, 8)}...`}
                      </p>
                    )}
                  </div>

                  {/* Responsável */}
                  <div>
                    <p className="text-sm text-gray-700 truncate">{passo.responsavel_nome || <span className="text-gray-300 italic">Não definido</span>}</p>
                  </div>

                  {/* Prazo */}
                  <div>
                    {prazoDate ? (
                      <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : isToday_ ? "text-orange-600" : "text-gray-600"}`}>
                        {isOverdue && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                        {format(prazoDate, "dd/MM/yy", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={passo.status} /></div>

                  {/* Progresso */}
                  <div className="min-w-[80px]">
                    <ProgressBar value={passo.percentual_execucao} />
                  </div>

                  {/* Prioridade */}
                  <div>
                    <span className={`text-xs font-semibold ${PRIORIDADE_CONFIG[passo.prioridade]?.color || "text-gray-500"}`}>
                      {PRIORIDADE_CONFIG[passo.prioridade]?.label || "—"}
                    </span>
                  </div>

                  {/* Ação */}
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-3"
                      onClick={e => { e.stopPropagation(); setSelectedPasso(passo); }}
                    >
                      Abrir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de detalhe */}
      {selectedPasso && (
        <ProximoPassoModal
          passo={selectedPasso}
          onClose={() => setSelectedPasso(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
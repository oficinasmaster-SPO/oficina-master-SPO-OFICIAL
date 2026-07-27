/**
 * PedidosInternosTab — Shell fixo com toolbar + lista rolável
 *
 * Layout:
 * ┌─ Header fixo (shrink-0, shadow projetada sobre conteúdo) ─────────────┐
 * │  Tabs (Pedidos | Backlog) + Métricas rápidas + CTA                    │
 * │  Toolbar: Escopo (dropdown) + Search + Filtro Status                  │
 * │  Column Headers (fixos, alinhados com rows)                           │
 * ├─ shadow ──────────────────────────────────────────────────────────────┤
 * │  Lista agrupada (flex-1 overflow-y-auto, scrollbar contida)           │
 * └───────────────────────────────────────────────────────────────────────┘
 */
import React, { useState, useMemo, useCallback, useDeferredValue } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, X, User, ChevronDown, Inbox, Send as SendIcon, Users, InboxIcon, Send
} from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import NovoPedidoModal from "./NovoPedidoModal";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList, { ColumnHeaders } from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";

/* ═══════════════════════════════════════════════════════════════════════════
   SCOPE SELECTOR — Agora com contagem dinâmica (Antecipação)
   ═══════════════════════════════════════════════════════════════════════════ */
const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos", icon: Users,    description: "Ver tudo" },
  { key: "para_mim",     label: "Para mim",         icon: Inbox,    description: "Pedidos atribuídos a mim" },
  { key: "meus_pedidos", label: "Meus pedidos",     icon: SendIcon, description: "Pedidos que eu criei" },
];

function ScopeSelector({ value, onChange, counts }) {
  const [open, setOpen] = useState(false);
  const current = SCOPE_OPTIONS.find(o => o.key === value) || SCOPE_OPTIONS[0];
  const Icon = current.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors min-w-[170px]">
          <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 text-left">{current.label}</span>
          {/* Exibe o badge de contagem no próprio trigger */}
          <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
            {counts[current.key] || 0}
          </span>
          <ChevronDown className="ml-1 h-3 w-3 text-gray-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] p-1 shadow-lg" sideOffset={4}>
        {SCOPE_OPTIONS.map(opt => {
          const OptIcon = opt.icon;
          const active = opt.key === value;
          const count = counts[opt.key] || 0;
          return (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs transition-colors
                ${active ? "bg-blue-50/80 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <OptIcon className={`h-4 w-4 shrink-0 ${active ? "text-blue-500" : "text-gray-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{opt.label}</p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   METRIC PILLS — Hierarquia visual premium substituindo os dots antigos
   ═══════════════════════════════════════════════════════════════════════════ */
function MetricPill({ theme, count, label }) {
  if (count === 0) return null;
  
  const themes = {
    blue: "bg-blue-50 text-blue-700 ring-blue-500/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-500/30",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ring-1 ring-inset ${themes[theme]} transition-all cursor-default hover:opacity-80`}>
      <span className="font-bold tabular-nums text-xs">{count}</span>
      <span className="text-[10px] font-semibold opacity-85 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido]   = useState(null);
  const [showNewForm, setShowNewForm]       = useState(false);
  const [activeList, setActiveList]         = useState("pedidos");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [scope, setScope]                   = useState("todos");
  
  // Melhoria 1: Input Snappiness com useDeferredValue
  const [search, setSearch]                 = useState("");
  const deferredSearch                      = useDeferredValue(search); 
  
  const queryClient = useQueryClient();

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-internos", workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.PedidoInterno.filter({ workshop_id: workshopId }, "-created_date")
        : await base44.entities.PedidoInterno.list("-created_date");
      return all || [];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-sistema"],
    queryFn: async () => (await base44.entities.User.list()) || [],
  });

  /* ── Métricas & Contagens ─────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const active = pedidos.filter(p => !["concluido", "recusado"].includes(p.status));
    return {
      em_analise: active.filter(p => p.status === "em_analise").length,
      pendentes:  active.filter(p => p.status === "pendente").length,
      aprovados:  active.filter(p => p.status === "aprovado").length,
    };
  }, [pedidos]);

  // Contagem antecipada para o ScopeSelector
  const scopeCounts = useMemo(() => {
    const userId = user?.id;
    const userEmail = user?.email;
    return {
      todos: pedidos.length,
      para_mim: pedidos.filter(p => p.assignee_id === userId || (userEmail && p.assignee_id === userEmail)).length,
      meus_pedidos: pedidos.filter(p => p.requester_id === userId || (userEmail && (p.requester_id === userEmail || p.created_by === userEmail))).length
    };
  }, [pedidos, user]);

  /* ── Filtro + ordenação ────────────────────────────────────────────────── */
  const filteredPedidos = useMemo(() => {
    const userId = user?.id;
    const userEmail = user?.email;

    return pedidos
      .filter((p) => {
        // Scope
        if (scope === "para_mim") {
          const isAssignee = p.assignee_id === userId || (userEmail && p.assignee_id === userEmail);
          if (!isAssignee) return false;
        }
        if (scope === "meus_pedidos") {
          const isRequester = p.requester_id === userId || (userEmail && p.requester_id === userEmail) || (userEmail && p.created_by === userEmail);
          if (!isRequester) return false;
        }

        // Search (Usando o valor diferido para performance)
        const q = deferredSearch.toLowerCase();
        if (q) {
          const haystack = [
            p.titulo, p.workshop_nome, p.requester_name,
            p.assignee_name, p.id?.slice(-6),
          ].filter(Boolean).join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        // Status
        if (statusFilter !== "all" && p.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const hoje = new Date();
        const isFimA = ["concluido", "recusado"].includes(a.status);
        const isFimB = ["concluido", "recusado"].includes(b.status);
        if (isFimA !== isFimB) return isFimA ? 1 : -1;
        const isVencA = a.prazo && new Date(a.prazo) < hoje && !isFimA;
        const isVencB = b.prazo && new Date(b.prazo) < hoje && !isFimB;
        if (isVencA !== isVencB) return isVencA ? -1 : 1;
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      });
  }, [pedidos, deferredSearch, statusFilter, scope, user?.id, user?.email]);

  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    return pedidos.find((p) => p.id === selectedPedido.id) || selectedPedido;
  }, [selectedPedido, pedidos]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleSelect = useCallback((p) => setSelectedPedido(p), []);
  const handleDetailClose = useCallback(() => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);
  const handleFormClose = useCallback(() => {
    setShowNewForm(false);
    setEditingPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const hasFilters = deferredSearch || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">

      <PedidoInternoModal open={!!selectedPedido} onClose={() => setSelectedPedido(null)} size="wide">
        {freshSelected && (
          <PedidoInternoDetail
            pedido={freshSelected}
            user={user}
            onCancel={() => setSelectedPedido(null)}
            onSuccess={handleDetailClose}
            onDelete={handleDetailClose}
          />
        )}
      </PedidoInternoModal>

      {showNewForm && !editingPedido && (
        <NovoPedidoModal user={user} onClose={handleFormClose} />
      )}

      <PedidoInternoModal open={showNewForm && !!editingPedido} onClose={() => { setShowNewForm(false); setEditingPedido(null); }} size="default">
        {showNewForm && editingPedido && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <PedidoInternoForm
              pedido={editingPedido}
              user={user}
              usuarios={usuarios}
              onCancel={() => { setShowNewForm(false); setEditingPedido(null); }}
              onSuccess={handleFormClose}
            />
          </div>
        )}
      </PedidoInternoModal>

      <Tabs
        value={activeList}
        onValueChange={setActiveList}
        className="flex min-h-0 flex-1 flex-col"
      >
        {/* ── HEADER FIXO (shrink-0) ── */}
        <div className="shrink-0 border-b border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] z-10 relative">

          <div className="flex items-center gap-4 px-4 py-2.5">
            <TabsList className="h-9 gap-1 rounded-lg bg-gray-100/80 p-1">
              <TabsTrigger
                value="pedidos"
                className="h-7 rounded-md px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500"
              >
                Pedidos Internos
              </TabsTrigger>
              <TabsTrigger
                value="backlog"
                className="h-7 rounded-md px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500"
              >
                Backlog de Tarefas
              </TabsTrigger>
            </TabsList>

            {activeList === "pedidos" && (
              <>
                <div className="hidden md:flex items-center gap-2 border-l border-gray-200 pl-4">
                  <MetricPill theme="blue"    count={metrics.em_analise} label="em análise" />
                  <MetricPill theme="amber"   count={metrics.pendentes}  label="pendentes" />
                  <MetricPill theme="emerald" count={metrics.aprovados}  label="aprovados" />
                </div>

                <Button
                  onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
                  size="sm"
                  className="ml-auto h-8 gap-1.5 bg-blue-600 text-xs font-bold tracking-wide shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Novo Pedido
                </Button>
              </>
            )}
          </div>

          {/* ── TOOLBAR ── */}
          {activeList === "pedidos" && (
            <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 bg-gray-50/30">
              
              <ScopeSelector value={scope} onChange={setScope} counts={scopeCounts} />
              
              <div className="flex-1" />
              
              {/* Melhoria 3: Search Avançado com Shortcut Visual e Botão Limpar */}
              <div className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pedido, requerente ou ID..."
                  className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-12 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  {search ? (
                    <button 
                      onClick={() => setSearch("")} 
                      className="text-gray-400 hover:text-gray-700 p-0.5 rounded-full hover:bg-gray-100 transition-colors animate-in zoom-in duration-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="flex h-4 items-center rounded border border-gray-200 bg-gray-50 px-1 text-[9px] font-bold text-gray-400 pointer-events-none select-none">
                      /
                    </span>
                  )}
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[150px] shrink-0 rounded-lg text-xs bg-white shadow-sm border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <SelectValue placeholder="Todos status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-medium">Todos status</SelectItem>
                  {PEDIDO_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Melhoria 4: Animação na entrada para evitar Layout Shift brusco */}
              {hasFilters && (
                <button 
                  onClick={clearFilters} 
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  <X className="h-3.5 w-3.5" /> Limpar
                </button>
              )}
              
              <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 shrink-0 border-l border-gray-200 pl-3">
                {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
          )}

          {activeList === "pedidos" && <ColumnHeaders />}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SCROLLABLE CONTENT 
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent
          value="backlog"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}
        >
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        <TabsContent
          value="pedidos"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/30 ${activeList !== "pedidos" ? "hidden" : ""}`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            
            {/* Melhoria 5: O Estado Vazio Rico & Tratado */}
            {filteredPedidos.length > 0 ? (
              <PedidoInternoList
                pedidos={filteredPedidos}
                onSelect={handleSelect}
                isLoading={isLoading}
                selectedId={selectedPedido?.id}
              />
            ) : !isLoading && (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 slide-in-from-bottom-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-5 ring-4 ring-gray-50 shadow-inner">
                  <Search className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-base font-bold text-gray-800 tracking-tight">Nenhum pedido encontrado</h3>
                <p className="mt-1.5 text-sm text-gray-500 max-w-sm leading-relaxed">
                  {hasFilters
                    ? "Não encontramos resultados correspondentes aos seus filtros de busca atuais. Tente usar termos mais genéricos."
                    : "Ainda não há nenhum pedido registrado nesta base. Cadastre o primeiro pedido interno para começar."}
                </p>
                
                {hasFilters ? (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="mt-6 h-9 px-5 text-xs font-semibold">
                    Limpar Filtros de Busca
                  </Button>
                ) : (
                  <Button onClick={() => setShowNewForm(true)} size="sm" className="mt-6 h-9 px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Pedido
                  </Button>
                )}
              </div>
            )}
            
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
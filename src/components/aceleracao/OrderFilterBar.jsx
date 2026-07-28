import React from "react";
import { Search, X } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";
import ScopeSelector from "./ScopeSelector";

export default function OrderFilterBar({
  scope,
  setScope,
  search,
  setSearch,
  searchInputRef,
  clearFilters,
  statusFilter,
  setStatusFilter,
  filteredPedidos = []
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-1.5 bg-gray-50/50 border-t border-[hsl(var(--border-subtle))] shrink-0">

      {/* GRUPO DE FILTROS (Dropdowns agrupados) */}
      <div className="flex items-center gap-2">
        <ScopeSelector value={scope} onChange={setScope} />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] bg-white border-gray-200 shadow-sm text-[12.5px] font-medium text-gray-700">
            <SelectValue placeholder="Todos status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12.5px]">Todos status</SelectItem>
            {PEDIDO_STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-[12.5px]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CAMPO DE PESQUISA */}
      <div className="relative w-[340px]">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, ID, cliente ou solicitante..."
          className="h-8 w-full rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-subtle))] pl-9 pr-10 text-[12.5px] text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {!search && (
            <span className="rounded border bg-gray-50 px-1 py-0.5 text-[9px] font-bold text-gray-400">
              /
            </span>
          )}
          {search && (
            <button
              onClick={clearFilters}
              className="text-gray-400 hover:text-gray-700 hover:bg-[hsl(var(--row-hover))] text-[12.5px] rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* CONTADOR com container destacado */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200/80 rounded-md shadow-sm">
        <span className="text-[12px] font-bold text-gray-700">
          {filteredPedidos.length}
        </span>
        <span className="text-[12px] font-medium text-gray-500">
          {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
        </span>
      </div>
    </div>
  );
}
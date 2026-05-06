import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTS = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "aguardando_consultor", label: "Aguardando consultor" },
  { value: "validacao", label: "Validação" },
  { value: "atrasado", label: "Atrasado" },
  { value: "finalizado", label: "Finalizado" },
  { value: "cancelado", label: "Cancelado" },
];

const PRIORIDADE_OPTS = [
  { value: "todas", label: "Todas as prioridades" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export default function ProximosPassosFiltros({ filtros, onChange, passos }) {
  // Extrair consultores e clientes únicos da lista
  const consultores = [...new Map(
    passos.filter(p => p.consultor_id && p.consultor_nome)
      .map(p => [p.consultor_id, { id: p.consultor_id, nome: p.consultor_nome }])
  ).values()];

  // workshop_nome não existe na entidade — usar workshop_id como identificador
  const workshops = [...new Map(
    passos.filter(p => p.workshop_id)
      .map(p => [p.workshop_id, { id: p.workshop_id, nome: p.workshop_id.slice(0, 8) }])
  ).values()];

  const hasActiveFilters =
    filtros.status !== "todos" ||
    filtros.prioridade !== "todas" ||
    filtros.consultor_id ||
    filtros.workshop_id ||
    filtros.apenas_atrasados;

  const clearAll = () =>
    onChange({ status: "todos", prioridade: "todas", consultor_id: "", workshop_id: "", apenas_atrasados: false });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Filter className="w-3.5 h-3.5" /> Filtrar:
      </div>

      <Select value={filtros.status} onValueChange={(v) => onChange({ ...filtros, status: v })}>
        <SelectTrigger className="h-8 text-xs w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.prioridade} onValueChange={(v) => onChange({ ...filtros, prioridade: v })}>
        <SelectTrigger className="h-8 text-xs w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORIDADE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        onClick={() => onChange({ ...filtros, apenas_atrasados: !filtros.apenas_atrasados })}
        className={`h-8 px-3 text-xs rounded-lg border font-medium transition-all ${
          filtros.apenas_atrasados
            ? "bg-red-600 text-white border-red-600"
            : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
        }`}
      >
        Só atrasados
      </button>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 text-xs gap-1 text-gray-500">
          <X className="w-3.5 h-3.5" /> Limpar
        </Button>
      )}

      <span className="ml-auto text-xs text-gray-400">
        {passos.length} registro{passos.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
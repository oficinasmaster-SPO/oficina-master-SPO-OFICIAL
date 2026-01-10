import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function BacklogFilters({ 
  filters, 
  onFilterChange, 
  consultores, 
  clientes 
}) {
  const handleInputChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      consultor: 'all',
      cliente: 'all',
      status: 'all',
      prioridade: 'all',
      origem: 'all'
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Filtros</h3>
        <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 px-2">
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Buscar</label>
          <Input
            type="text"
            placeholder="Título, cliente..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Consultor</label>
          <select
            value={filters.consultor}
            onChange={(e) => handleInputChange('consultor', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todos</option>
            {consultores.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Cliente</label>
          <select
            value={filters.cliente}
            onChange={(e) => handleInputChange('cliente', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todos</option>
            {clientes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todas</option>
            <option value="aberta">Aberta</option>
            <option value="em_execucao">Em Execução</option>
            <option value="bloqueada">Bloqueada</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Prioridade</label>
          <select
            value={filters.prioridade}
            onChange={(e) => handleInputChange('prioridade', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Origem</label>
          <select
            value={filters.origem}
            onChange={(e) => handleInputChange('origem', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todas</option>
            <option value="reuniao">Reunião</option>
            <option value="contrato">Contrato</option>
            <option value="diagnostico">Diagnóstico</option>
            <option value="pedido">Pedido</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function PedidosFilters({ 
  filters, 
  onFilterChange 
}) {
  const handleInputChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      status: 'all',
      prioridade: 'all',
      tipo: 'all'
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">Filtros</h3>
        <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 px-2">
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
          <label className="text-xs font-medium text-gray-700 block mb-1">Tipo</label>
          <select
            value={filters.tipo}
            onChange={(e) => handleInputChange('tipo', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todos</option>
            <option value="apoio_tecnico">Apoio Técnico</option>
            <option value="decisao_estrategica">Decisão Estratégica</option>
            <option value="liberacao_material">Liberação de Material</option>
            <option value="excecao_escopo">Exceção de Escopo</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full h-8 text-sm border border-gray-300 rounded px-2"
          >
            <option value="all">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="em_analise">Em Análise</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
            <option value="concluido">Concluído</option>
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
      </div>
    </div>
  );
}
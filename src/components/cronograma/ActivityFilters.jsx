import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ActivityFilters({ filters, onFilterChange, onClearFilters }) {
  const hasActiveFilters = filters.period !== 'all' || 
                          filters.status !== 'all' || 
                          filters.type !== 'all' ||
                          filters.search !== '';

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Ativos
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Busca por texto */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar atividade..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filtro por Período */}
        <Select 
          value={filters.period} 
          onValueChange={(value) => onFilterChange({ ...filters, period: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Últimos 7 dias</SelectItem>
            <SelectItem value="month">Últimos 30 dias</SelectItem>
            <SelectItem value="quarter">Últimos 90 dias</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
            <SelectItem value="upcoming">Próximas</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Status */}
        <Select 
          value={filters.status} 
          onValueChange={(value) => onFilterChange({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Tipo */}
        <Select 
          value={filters.type} 
          onValueChange={(value) => onFilterChange({ ...filters, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="ritual">Ritual</SelectItem>
            <SelectItem value="treinamento">Treinamento</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="avaliacao">Avaliação</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resumo dos filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.search && (
            <Badge variant="outline">
              Busca: "{filters.search}"
            </Badge>
          )}
          {filters.period !== 'all' && (
            <Badge variant="outline">
              Período: {filters.period}
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="outline">
              Status: {filters.status}
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="outline">
              Tipo: {filters.type}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
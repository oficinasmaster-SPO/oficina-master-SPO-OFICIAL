import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, User as UserIcon } from "lucide-react";

export default function ActionFiltersBar({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  employees,
  activeFiltersCount 
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Operacionais
            {activeFiltersCount > 0 && (
              <Badge className="bg-blue-600">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Busca Textual */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por título, descrição ou responsável..."
              value={filters.searchTerm}
              onChange={(e) => onFilterChange('searchTerm', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Status */}
            <Select 
              value={filters.filterStatus} 
              onValueChange={(v) => onFilterChange('filterStatus', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">📋 Todos os Status</SelectItem>
                <SelectItem value="a_fazer">⚪ A Fazer</SelectItem>
                <SelectItem value="em_andamento">🟡 Em Andamento</SelectItem>
                <SelectItem value="concluido">🟢 Concluído</SelectItem>
              </SelectContent>
            </Select>

            {/* Responsável */}
            <Select 
              value={filters.filterResponsavel} 
              onValueChange={(v) => onFilterChange('filterResponsavel', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Todos os Responsáveis
                  </span>
                </SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prazo */}
            <Select 
              value={filters.filterPrazo} 
              onValueChange={(v) => onFilterChange('filterPrazo', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">📅 Todos os Prazos</SelectItem>
                <SelectItem value="hoje">🎯 Hoje</SelectItem>
                <SelectItem value="proximas">⏰ Próximas (≤3 dias)</SelectItem>
                <SelectItem value="semana">📆 Esta Semana</SelectItem>
                <SelectItem value="atrasadas">🚨 Atrasadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Paralisação/Antiguidade */}
            <Select 
              value={filters.filterParalisacao} 
              onValueChange={(v) => onFilterChange('filterParalisacao', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">🔄 Todas as Situações</SelectItem>
                <SelectItem value="paradas">⚠️ Paradas (&gt;7 dias)</SelectItem>
                <SelectItem value="antigas">📦 Antigas (&gt;30 dias)</SelectItem>
                <SelectItem value="recentes">✨ Recentes (&lt;7 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkbox Minhas Ações */}
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="minhas-acoes"
              checked={filters.minhasAcoes}
              onChange={(e) => onFilterChange('minhasAcoes', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="minhas-acoes" className="text-sm font-medium text-blue-900 cursor-pointer flex-1">
              👤 Mostrar Apenas Minhas Ações
            </label>
            {filters.minhasAcoes && (
              <Badge className="bg-blue-600">Filtro Ativo</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskFilters({ 
  filters, 
  onFilterChange, 
  employees, 
  workshops,
  onClearFilters 
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          {(filters.search || filters.status !== 'all' || filters.priority !== 'all' || 
            filters.assignedTo !== 'all' || filters.workshop !== 'all' || filters.overdue) && (
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto">
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Buscar tarefas..."
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status */}
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {/* Prioridade */}
            <Select
              value={filters.priority}
              onValueChange={(value) => onFilterChange({ ...filters, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>

            {/* Atribuído a */}
            <Select
              value={filters.assignedTo}
              onValueChange={(value) => onFilterChange({ ...filters, assignedTo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Atribuído a" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="me">Minhas Tarefas</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Oficina */}
            <Select
              value={filters.workshop}
              onValueChange={(value) => onFilterChange({ ...filters, workshop: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Oficina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Oficinas</SelectItem>
                {workshops.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filters.overdue ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFilterChange({ ...filters, overdue: !filters.overdue })}
            >
              Atrasadas
            </Badge>
            <Badge
              variant={filters.dueToday ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFilterChange({ ...filters, dueToday: !filters.dueToday })}
            >
              Vence Hoje
            </Badge>
            <Badge
              variant={filters.dueThisWeek ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFilterChange({ ...filters, dueThisWeek: !filters.dueThisWeek })}
            >
              Vence esta Semana
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function RBACLogFilters({ filters, onChange, onReset }) {
  const hasActiveFilters = 
    filters.searchTerm || 
    filters.actionType !== "all" || 
    filters.targetType !== "all" || 
    filters.dateRange !== "all" ||
    filters.performedBy !== "all" ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar usuário, alvo, IP..."
            value={filters.searchTerm}
            onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.actionType}
          onValueChange={(value) => onChange({ ...filters, actionType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo de Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Ações</SelectItem>
            <SelectItem value="profile_created">Perfil Criado</SelectItem>
            <SelectItem value="profile_updated">Perfil Atualizado</SelectItem>
            <SelectItem value="profile_deleted">Perfil Deletado</SelectItem>
            <SelectItem value="role_created">Role Criada</SelectItem>
            <SelectItem value="role_updated">Role Atualizada</SelectItem>
            <SelectItem value="role_deleted">Role Deletada</SelectItem>
            <SelectItem value="granular_permission_updated">Permissão Granular</SelectItem>
            <SelectItem value="permission_request_approved">Solicitação Aprovada</SelectItem>
            <SelectItem value="permission_request_rejected">Solicitação Rejeitada</SelectItem>
            <SelectItem value="user_permission_changed">Permissão Alterada</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.targetType}
          onValueChange={(value) => onChange({ ...filters, targetType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo de Recurso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="profile">Perfil</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="granular_config">Config. Granular</SelectItem>
            <SelectItem value="employee">Colaborador</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange}
          onValueChange={(value) => onChange({ ...filters, dateRange: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o Período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Última Semana</SelectItem>
            <SelectItem value="month">Último Mês</SelectItem>
            <SelectItem value="quarter">Último Trimestre</SelectItem>
            <SelectItem value="year">Último Ano</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onReset}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {filters.dateRange === "custom" && (
        <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="flex gap-4 flex-1">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-700">Data Início</label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-700">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
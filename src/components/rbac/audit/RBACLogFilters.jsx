import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function RBACLogFilters({ filters, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por usuário ou alvo..."
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
        </SelectContent>
      </Select>
    </div>
  );
}
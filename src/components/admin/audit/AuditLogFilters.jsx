import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuditLogFilters({ filters, onFilterChange }) {
  const actions = [
    { value: 'all', label: 'Todas as Ações' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'user_approved', label: 'Aprovação de Acesso' },
    { value: 'user_blocked', label: 'Bloqueio de Usuário' },
    { value: 'user_unblocked', label: 'Desbloqueio' },
    { value: 'password_reset', label: 'Reset de Senha' },
    { value: 'user_created', label: 'Criação de Usuário' },
    { value: 'user_updated', label: 'Atualização de Usuário' },
    { value: 'user_deleted', label: 'Exclusão de Usuário' },
    { value: 'permission_changed', label: 'Alteração de Permissão' }
  ];

  const entityTypes = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'User', label: 'Usuário' },
    { value: 'Employee', label: 'Colaborador' },
    { value: 'UserPermission', label: 'Permissão' },
    { value: 'Workshop', label: 'Oficina' }
  ];

  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-48">
        <Select
          value={filters.action}
          onValueChange={(value) => onFilterChange({ ...filters, action: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            {actions.map(action => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-48">
        <Select
          value={filters.entity_type}
          onValueChange={(value) => onFilterChange({ ...filters, entity_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Input
          type="date"
          value={filters.date_from}
          onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })}
          className="w-40"
        />
        <span className="text-gray-500 self-center">até</span>
        <Input
          type="date"
          value={filters.date_to}
          onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })}
          className="w-40"
        />
      </div>
    </div>
  );
}
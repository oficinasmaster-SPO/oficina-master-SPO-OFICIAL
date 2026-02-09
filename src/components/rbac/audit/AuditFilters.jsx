import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

export default function AuditFilters({ filters, onFiltersChange, onClearFilters }) {
  const hasActiveFilters = filters.searchTerm || filters.actionType !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Usuário, alterado por..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label>Tipo de Ação</Label>
          <select
            value={filters.actionType}
            onChange={(e) => onFiltersChange({ ...filters, actionType: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="all">Todas as Ações</option>
            <option value="profile_changed">Mudança de Perfil</option>
            <option value="status_changed">Mudança de Status</option>
            <option value="custom_roles_changed">Mudança de Roles</option>
            <option value="permission_change_approved">Aprovações</option>
            <option value="permission_change_rejected">Rejeições</option>
          </select>
        </div>

        <div>
          <Label>Data Inicial</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        <div>
          <Label>Data Final</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

export default function UserFilters({ 
  filters, 
  onFiltersChange, 
  profiles, 
  admins,
  onClearFilters 
}) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== "" && v !== "todos" && v !== null
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Avançados
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Limpar {activeFiltersCount} filtro(s)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca por Nome/Email */}
          <div className="md:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={filters.search || ""}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Cargo */}
          <Input
            placeholder="Filtrar por cargo..."
            value={filters.position || ""}
            onChange={(e) => updateFilter('position', e.target.value)}
          />

          {/* Status */}
          <Select value={filters.status || "todos"} onValueChange={(v) => updateFilter('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pending">⏳ Aguardando Aprovação</SelectItem>
              <SelectItem value="active">✅ Ativo</SelectItem>
              <SelectItem value="inactive">⏸️ Inativo</SelectItem>
              <SelectItem value="blocked">🔒 Bloqueado</SelectItem>
            </SelectContent>
          </Select>

          {/* Perfil */}
          <Select value={filters.profile || "todos"} onValueChange={(v) => updateFilter('profile', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Perfis</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Admin Responsável */}
          <Select value={filters.admin || "todos"} onValueChange={(v) => updateFilter('admin', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Admin Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Admins</SelectItem>
              {admins.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Último Login */}
          <Select value={filters.lastLogin || "todos"} onValueChange={(v) => updateFilter('lastLogin', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Último Login" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer período</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">Últimos 7 dias</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="nunca">Nunca acessou</SelectItem>
            </SelectContent>
          </Select>

          {/* Tipo de Alerta */}
          <Select value={filters.alert || "todos"} onValueChange={(v) => updateFilter('alert', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Alertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="primeiro_acesso">Aguardando 1º acesso</SelectItem>
              <SelectItem value="inatividade_30">Inatividade +30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
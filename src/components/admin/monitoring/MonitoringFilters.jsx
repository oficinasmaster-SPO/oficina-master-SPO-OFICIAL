import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Save } from "lucide-react";

export default function MonitoringFilters({ 
  onFiltersChange,
  allUsers = [],
  initialFilters = {}
}) {
  const [filters, setFilters] = useState({
    userType: 'all',
    userId: '',
    status: 'all',
    timeRange: 'today',
    eventType: 'all',
    minActiveTime: '',
    maxIdleTime: '',
    searchTerm: '',
    ...initialFilters
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters = {
      userType: 'all',
      userId: '',
      status: 'all',
      timeRange: 'today',
      eventType: 'all',
      minActiveTime: '',
      maxIdleTime: '',
      searchTerm: ''
    };
    setFilters(defaultFilters);
    onFiltersChange?.(defaultFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'userType') return value !== 'all';
    if (key === 'status') return value !== 'all';
    if (key === 'timeRange') return value !== 'today';
    if (key === 'eventType') return value !== 'all';
    return value !== '';
  });

  const internalUsers = allUsers.filter(u => u.tipo_vinculo === 'interno' || u.is_internal);
  const externalUsers = allUsers.filter(u => u.tipo_vinculo !== 'interno' && !u.is_internal);

  return (
    <Card className="border-2 border-indigo-100">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Linha 1: Busca + Tipo de Usuário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.userType} onValueChange={(v) => handleFilterChange('userType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌐 Todos os Usuários</SelectItem>
                <SelectItem value="internal">👔 Internos ({internalUsers.length})</SelectItem>
                <SelectItem value="external">👤 Externos ({externalUsers.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha 2: Usuário Específico + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={filters.userId} onValueChange={(v) => handleFilterChange('userId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar usuário específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {filters.userType === 'internal' || filters.userType === 'all' ? (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">INTERNOS</div>
                    {internalUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </>
                ) : null}
                {filters.userType === 'external' || filters.userType === 'all' ? (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">EXTERNOS</div>
                    {externalUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </>
                ) : null}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">🟢 Ativo</SelectItem>
                <SelectItem value="idle">💤 Inativo (Idle)</SelectItem>
                <SelectItem value="offline">⚫ Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha 3: Período + Tipo de Evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={filters.timeRange} onValueChange={(v) => handleFilterChange('timeRange', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">⚡ Agora</SelectItem>
                <SelectItem value="today">📅 Hoje</SelectItem>
                <SelectItem value="24h">🕐 Últimas 24h</SelectItem>
                <SelectItem value="7d">📊 Últimos 7 dias</SelectItem>
                <SelectItem value="30d">📈 Últimos 30 dias</SelectItem>
                <SelectItem value="all">🌍 Todo período</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.eventType} onValueChange={(v) => handleFilterChange('eventType', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Eventos</SelectItem>
                <SelectItem value="login">🔓 Login</SelectItem>
                <SelectItem value="logout">🔒 Logout</SelectItem>
                <SelectItem value="page_view">👁️ Visualização</SelectItem>
                <SelectItem value="idle_start">💤 Início Idle</SelectItem>
                <SelectItem value="idle_end">▶️ Fim Idle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha 4: Controles de Tempo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Tempo Ativo Mínimo (min)</label>
              <Input
                type="number"
                placeholder="Ex: 5"
                value={filters.minActiveTime}
                onChange={(e) => handleFilterChange('minActiveTime', e.target.value)}
                min="0"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">Tempo Idle Máximo (min)</label>
              <Input
                type="number"
                placeholder="Ex: 10"
                value={filters.maxIdleTime}
                onChange={(e) => handleFilterChange('maxIdleTime', e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              {hasActiveFilters && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                  <Filter className="w-3 h-3 mr-1" />
                  Filtros ativos
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
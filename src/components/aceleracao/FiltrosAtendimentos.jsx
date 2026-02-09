import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, subDays } from "date-fns";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";

export default function FiltrosAtendimentos({ 
  filters, 
  onFiltersChange, 
  workshops = [], 
  consultores = [],
  onClearFilters,
  isLoading = false
}) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handlePresetChange = (preset) => {
    const hoje = new Date();
    let dataInicio = null;
    let dataFim = format(hoje, "yyyy-MM-dd");

    switch (preset) {
      case "7d":
        dataInicio = format(subDays(hoje, 7), "yyyy-MM-dd");
        break;
      case "15d":
        dataInicio = format(subDays(hoje, 15), "yyyy-MM-dd");
        break;
      case "30d":
        dataInicio = format(subDays(hoje, 30), "yyyy-MM-dd");
        break;
      case "mes_atual":
        const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataInicio = format(primeiroDia, "yyyy-MM-dd");
        break;
      case "custom":
        dataInicio = "";
        dataFim = "";
        break;
      default:
        dataInicio = "";
        dataFim = "";
    }

    onFiltersChange({
      ...filters,
      preset,
      dateFrom: dataInicio,
      dateTo: dataFim
    });
  };

  const clearAll = () => {
    onClearFilters();
    setShowAdvanced(false);
  };

  const hasActiveFilters = filters.searchTerm || filters.workshop_id || filters.consultor_id || 
                          filters.status || filters.tipo_atendimento || filters.dateFrom || filters.dateTo;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="pt-6 space-y-4">
        {/* Busca Principal e Botões de Ação */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, tipo de atendimento, consultor..."
              value={filters.searchTerm || ""}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2 bg-white"
          >
            <Filter className="w-4 h-4" />
            {showAdvanced ? "Ocultar" : "Filtros"}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="gap-2"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Filtros Avançados */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-blue-200">
            {/* Primeira Linha: Período Rápido */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">Período Rápido</Label>
                <Select
                  value={filters.preset || "30d"}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="15d">Últimos 15 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="mes_atual">Mês Atual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">Data Início</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => {
                    updateFilter("dateFrom", e.target.value);
                    updateFilter("preset", "custom");
                  }}
                  className="bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold text-gray-700">Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => {
                    updateFilter("dateTo", e.target.value);
                    updateFilter("preset", "custom");
                  }}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Segunda Linha: Filtros Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Cliente</Label>
                <Select
                  value={filters.workshop_id || "all"}
                  onValueChange={(v) => updateFilter("workshop_id", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Consultor</Label>
                <Select
                  value={filters.consultor_id || "all"}
                  onValueChange={(v) => updateFilter("consultor_id", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Consultores</SelectItem>
                    {consultores.map((c) => (
                      <SelectItem key={c.id} value={c.user_id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) => updateFilter("status", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.ATRASADO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.ATRASADO]}
                    </SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.AGENDADO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.AGENDADO]}
                    </SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.CONFIRMADO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.CONFIRMADO]}
                    </SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.REAGENDADO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REAGENDADO]}
                    </SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.PARTICIPANDO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.PARTICIPANDO]}
                    </SelectItem>
                    <SelectItem value={ATENDIMENTO_STATUS.REALIZADO}>
                      {ATENDIMENTO_STATUS_LABELS[ATENDIMENTO_STATUS.REALIZADO]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Tipo Atendimento</Label>
                <Select
                  value={filters.tipo_atendimento || "all"}
                  onValueChange={(v) => updateFilter("tipo_atendimento", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
                    <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
                    <SelectItem value="reuniao_estrategica">Reunião Estratégica</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="auditoria">Auditoria</SelectItem>
                    <SelectItem value="revisao_metas">Revisão de Metas</SelectItem>
                    <SelectItem value="imersao_individual">Imersão Individual</SelectItem>
                    <SelectItem value="imersao_presencial">Imersão Presencial</SelectItem>
                    <SelectItem value="pda_grupo">PDA em Grupo</SelectItem>
                    <SelectItem value="aceleradores_presenciais">Aceleradores Presenciais</SelectItem>
                    <SelectItem value="imersao_online">Imersão Online</SelectItem>
                    <SelectItem value="mentoria">Mentoria</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Indicador de Filtros Ativos */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                <RefreshCw className="w-3 h-3" />
                Filtros ativos - {isLoading ? "Atualizando..." : "Resultados filtrados"}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
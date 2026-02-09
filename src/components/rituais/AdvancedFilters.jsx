import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";

export default function AdvancedFilters({ filters, onFiltersChange }) {
  const handleClearFilters = () => {
    onFiltersChange({
      frequency: "all",
      pillar: "all",
      dateFrom: "",
      dateTo: "",
      hasMAP: "all"
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "dateFrom" || key === "dateTo") return value !== "";
    return value !== "all";
  }).length;

  const pillarOptions = [
    { value: "all", label: "Todos os Pilares" },
    { value: "proposito", label: "Propósito" },
    { value: "missao", label: "Missão" },
    { value: "visao", label: "Visão" },
    { value: "valores", label: "Valores" },
    { value: "postura_atitudes", label: "Postura e Atitudes" },
    { value: "comportamentos_inaceitaveis", label: "Comportamentos Inaceitáveis" },
    { value: "rituais_cultura", label: "Rituais de Cultura" },
    { value: "sistemas_regras", label: "Sistemas e Regras" },
    { value: "comunicacao_interna", label: "Comunicação Interna" },
    { value: "lideranca", label: "Liderança" },
    { value: "foco_cliente", label: "Foco no Cliente" },
    { value: "performance_responsabilidade", label: "Performance e Responsabilidade" },
    { value: "desenvolvimento_continuo", label: "Desenvolvimento Contínuo" },
    { value: "identidade_pertencimento", label: "Identidade e Pertencimento" }
  ];

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Frequência</Label>
          <Select 
            value={filters.frequency} 
            onValueChange={(value) => onFiltersChange({ ...filters, frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quinzenal">Quinzenal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="continuo">Contínuo</SelectItem>
              <SelectItem value="eventual">Eventual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Pilar Cultural</Label>
          <Select 
            value={filters.pillar} 
            onValueChange={(value) => onFiltersChange({ ...filters, pillar: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pillarOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Data Início</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Data Fim</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">MAP Vinculado</Label>
        <Select 
          value={filters.hasMAP} 
          onValueChange={(value) => onFiltersChange({ ...filters, hasMAP: value })}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Com MAP</SelectItem>
            <SelectItem value="no">Sem MAP</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DocumentFilters({ filters, onFilterChange, onClear }) {
  const categories = [
    { value: "governanca", label: "Governança" },
    { value: "juridico_regimento", label: "Jurídico / Regimento" },
    { value: "rh_pessoas", label: "RH / Pessoas" },
    { value: "operacional", label: "Operacional" },
    { value: "tecnico", label: "Técnico" },
    { value: "comercial", label: "Comercial" },
    { value: "financeiro", label: "Financeiro" },
    { value: "treinamento", label: "Treinamento" },
    { value: "auditoria_dados", label: "Auditoria / Dados" }
  ];

  const docTypes = [
    { value: "regimento", label: "Regimento" },
    { value: "map", label: "MAP" },
    { value: "it", label: "IT" },
    { value: "politica", label: "Política" },
    { value: "checklist", label: "Checklist" },
    { value: "contrato", label: "Contrato" },
    { value: "relatorio", label: "Relatório" },
    { value: "treinamento", label: "Treinamento" },
    { value: "evidencia", label: "Evidência" }
  ];

  const statuses = [
    { value: "em_construcao", label: "Em Construção" },
    { value: "em_revisao", label: "Em Revisão" },
    { value: "aprovado", label: "Aprovado" },
    { value: "em_uso", label: "Em Uso" },
    { value: "obsoleto", label: "Obsoleto" },
    { value: "arquivado", label: "Arquivado" }
  ];

  const legalImpacts = [
    { value: "alto", label: "Alto" },
    { value: "medio", label: "Médio" },
    { value: "baixo", label: "Baixo" }
  ];

  const hasActiveFilters = filters.category || filters.document_type || filters.status || filters.legal_impact || filters.mandatory_by_law;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-gray-600">Área</Label>
            <Select 
              value={filters.category || "todos"}
              onValueChange={(val) => onFilterChange('category', val === 'todos' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Áreas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Tipo</Label>
            <Select 
              value={filters.document_type || "todos"}
              onValueChange={(val) => onFilterChange('document_type', val === 'todos' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {docTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Status</Label>
            <Select 
              value={filters.status || "todos"}
              onValueChange={(val) => onFilterChange('status', val === 'todos' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Impacto Jurídico</Label>
            <Select 
              value={filters.legal_impact || "todos"}
              onValueChange={(val) => onFilterChange('legal_impact', val === 'todos' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {legalImpacts.map(impact => (
                  <SelectItem key={impact.value} value={impact.value}>{impact.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-600">Obrigatório por Lei</Label>
            <Select 
              value={filters.mandatory_by_law || "todos"}
              onValueChange={(val) => onFilterChange('mandatory_by_law', val === 'todos' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
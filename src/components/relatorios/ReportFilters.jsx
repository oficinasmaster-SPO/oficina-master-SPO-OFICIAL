import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportFilters({ filters, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const diagnosticTypes = [
    { value: "todos", label: "Todos os Diagnósticos" },
    { value: "fase", label: "Fase da Oficina" },
    { value: "empresario", label: "Perfil Empresário" },
    { value: "maturidade", label: "Maturidade Colaborador" },
    { value: "producao", label: "Produção Colaborador" },
    { value: "desempenho", label: "Desempenho (Matriz)" },
    { value: "disc", label: "DISC Comportamental" },
    { value: "os", label: "Ordem de Serviço" },
    { value: "carga", label: "Carga de Trabalho" }
  ];

  const modules = [
    { value: "todos", label: "Todos os Módulos" },
    { value: "vendas", label: "Vendas" },
    { value: "comercial", label: "Comercial" },
    { value: "marketing", label: "Marketing" },
    { value: "pessoas", label: "Pessoas" },
    { value: "financeiro", label: "Financeiro" },
    { value: "processos", label: "Processos" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label>Data Início</Label>
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
        />
      </div>
      <div>
        <Label>Data Fim</Label>
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
        />
      </div>
      <div>
        <Label>Tipo de Diagnóstico</Label>
        <Select value={filters.diagnosticType} onValueChange={(val) => handleChange("diagnosticType", val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {diagnosticTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Módulo</Label>
        <Select value={filters.module} onValueChange={(val) => handleChange("module", val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modules.map(mod => (
              <SelectItem key={mod.value} value={mod.value}>
                {mod.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
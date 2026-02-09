import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";

export default function GroupFilters({ 
  filters, 
  onFilterChange, 
  onClear 
}) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <div className="space-y-3">
      {/* Filtros básicos */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            placeholder="Buscar grupo..."
            value={filters.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Empresa</Label>
          <Input
            placeholder="Filtrar..."
            value={filters.company || ""}
            onChange={(e) => handleChange("company", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Cidade</Label>
          <Input
            placeholder="Filtrar..."
            value={filters.city || ""}
            onChange={(e) => handleChange("city", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="w-3 h-3" />
            {showAdvanced ? "Menos" : "Mais"}
          </Button>
        </div>
      </div>

      {/* Filtros avançados */}
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border">
          <div>
            <Label className="text-xs">Data de Entrada (A partir de)</Label>
            <Input
              type="date"
              value={filters.entryDateFrom || ""}
              onChange={(e) => handleChange("entryDateFrom", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Data de Entrada (Até)</Label>
            <Input
              type="date"
              value={filters.entryDateTo || ""}
              onChange={(e) => handleChange("entryDateTo", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Plano Ativo</Label>
            <select
              value={filters.plan || ""}
              onChange={(e) => handleChange("plan", e.target.value)}
              className="h-8 text-xs border rounded px-2 w-full"
            >
              <option value="">Todos</option>
              <option value="FREE">FREE</option>
              <option value="START">START</option>
              <option value="BRONZE">BRONZE</option>
              <option value="PRATA">PRATA</option>
              <option value="GOLD">GOLD</option>
              <option value="IOM">IOM</option>
              <option value="MILLIONS">MILLIONS</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Data Renovação (A partir de)</Label>
            <Input
              type="date"
              value={filters.renewalDateFrom || ""}
              onChange={(e) => handleChange("renewalDateFrom", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Data Renovação (Até)</Label>
            <Input
              type="date"
              value={filters.renewalDateTo || ""}
              onChange={(e) => handleChange("renewalDateTo", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1"
              onClick={onClear}
            >
              <X className="w-3 h-3" />
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
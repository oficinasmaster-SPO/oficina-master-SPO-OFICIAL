import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Calendar, User } from "lucide-react";
import { computeDatesForPreset, PRESETS_PERIODO } from "@/utils/aceleracaoDates";

export default function FiltrosControleAceleracao({ 
  consultores = [], 
  filtros = {}, 
  onFiltrosChange 
}) {
  const handlePresetChange = (preset) => {
    if (preset === "custom") {
      onFiltrosChange({ ...filtros, preset: "custom" });
      return;
    }
    const { dataInicio, dataFim } = computeDatesForPreset(preset);
    onFiltrosChange({ ...filtros, preset, dataInicio, dataFim });
  };

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Filtros de Visualização</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro de Consultor */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              Consultor
            </Label>
            <Select
              value={filtros.consultorId || "todos"}
              onValueChange={(value) => onFiltrosChange({ ...filtros, consultorId: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os consultores</SelectItem>
                {consultores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preset de Período */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              Período
            </Label>
            <Select
              value={filtros.preset || "30d"}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS_PERIODO.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          <div>
            <Label className="mb-2 block">Data Início</Label>
            <Input
              type="date"
              value={filtros.dataInicio || ""}
              onChange={(e) => onFiltrosChange({ 
                ...filtros, 
                dataInicio: e.target.value,
                preset: "custom"
              })}
            />
          </div>

          {/* Data Fim */}
          <div>
            <Label className="mb-2 block">Data Fim</Label>
            <Input
              type="date"
              value={filtros.dataFim || ""}
              onChange={(e) => onFiltrosChange({ 
                ...filtros, 
                dataFim: e.target.value,
                preset: "custom"
              })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
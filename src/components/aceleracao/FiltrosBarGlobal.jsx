import React, { useMemo } from "react";
import { Calendar, User, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { computeDatesForPreset, PRESETS_PERIODO } from "@/utils/aceleracaoDates";

/**
 * Barra de filtros global do Controle da Aceleração.
 * Visível em todas as abas. Controla: período (preset + custom), consultor e toggle "só habilitados".
 * O toggle "só habilitados" restringe as opções do seletor de consultor aos consultores
 * com ConsultorCapacity.ativo = true. Quando ativo junto de "Todos os consultores",
 * a camada de estado também filtra os atendimentos exibidos.
 */
export default function FiltrosBarGlobal({ filtros = {}, onFiltrosChange, consultores = [] }) {
  const soHabilitados = !!filtros.soHabilitados;

  const consultoresVisiveis = useMemo(
    () => (soHabilitados ? consultores.filter((c) => c.ativo !== false) : consultores),
    [consultores, soHabilitados]
  );

  const handlePresetChange = (preset) => {
    if (preset === "custom") {
      onFiltrosChange({ ...filtros, preset: "custom" });
      return;
    }
    const { dataInicio, dataFim } = computeDatesForPreset(preset);
    onFiltrosChange({ ...filtros, preset, dataInicio, dataFim });
  };

  const handleToggleHabilitados = (checked) => {
    // Se ligando e o consultor atualmente selecionado está desabilitado, reseta para "todos"
    if (
      checked &&
      filtros.consultorId &&
      filtros.consultorId !== "todos"
    ) {
      const c = consultores.find((x) => x.id === filtros.consultorId);
      if (c && c.ativo === false) {
        onFiltrosChange({ ...filtros, soHabilitados: checked, consultorId: "todos" });
        return;
      }
    }
    onFiltrosChange({ ...filtros, soHabilitados: checked });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex flex-wrap items-end gap-4">
      {/* Período */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-gray-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Período
        </Label>
        <Select value={filtros.preset || "all"} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-44 h-9">
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

      {filtros.preset === "custom" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-500">De</Label>
            <Input
              type="date"
              value={filtros.dataInicio || ""}
              onChange={(e) =>
                onFiltrosChange({ ...filtros, dataInicio: e.target.value, preset: "custom" })
              }
              className="w-40 h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-500">Até</Label>
            <Input
              type="date"
              value={filtros.dataFim || ""}
              onChange={(e) =>
                onFiltrosChange({ ...filtros, dataFim: e.target.value, preset: "custom" })
              }
              className="w-40 h-9"
            />
          </div>
        </>
      )}

      {/* Consultor */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-gray-500 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Consultor
        </Label>
        <Select
          value={filtros.consultorId || "todos"}
          onValueChange={(v) => onFiltrosChange({ ...filtros, consultorId: v })}
        >
          <SelectTrigger className="w-52 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os consultores</SelectItem>
            {consultoresVisiveis.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Só habilitados */}
      <div className="flex items-center gap-2 pb-1.5 ml-auto">
        <Switch
          id="so-habilitados"
          checked={soHabilitados}
          onCheckedChange={handleToggleHabilitados}
        />
        <Label
          htmlFor="so-habilitados"
          className="text-sm text-gray-700 cursor-pointer flex items-center gap-1.5 select-none"
        >
          <Filter className="w-3.5 h-3.5" /> Só habilitados
        </Label>
      </div>
    </div>
  );
}
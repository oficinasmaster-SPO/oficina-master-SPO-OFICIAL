import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function FiltroPeriodo({ mes, ano, periodo, onMesChange, onAnoChange, onPeriodoChange }) {
  // Gerar anos (ano atual -2 até +2)
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  // Gerar meses
  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Mês — só no modo mensal */}
      {periodo === "mensal" && (
        <Select value={mes} onValueChange={onMesChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {meses.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Ano — aparece em AMBOS os modos */}
      <Select value={String(ano)} onValueChange={onAnoChange}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup 
        type="single" 
        value={periodo} 
        onValueChange={onPeriodoChange}
        className="gap-1"
      >
        <ToggleGroupItem value="mensal" className="text-xs px-3 py-1.5">
          📅 Mensal
        </ToggleGroupItem>
        <ToggleGroupItem value="anual" className="text-xs px-3 py-1.5">
          📊 Anual
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
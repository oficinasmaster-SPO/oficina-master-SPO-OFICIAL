import React, { useMemo } from "react";
import Combobox from "@/components/ui/combobox";
import AbasSegmentadas from "@/components/shared/AbasSegmentadas";
import { CalendarDays, CalendarRange } from "lucide-react";

const MESES = [
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
  { value: "12", label: "Dezembro" },
];

const MODOS = [
  { value: "mensal", label: "Mensal", icon: CalendarDays },
  { value: "anual",  label: "Anual",  icon: CalendarRange },
];

/**
 * FiltroPeriodo — seletor de competência compartilhado (DRE Avançado, DFC, Carteira).
 *
 * - Mês e ano usam o Combobox compartilhado (busca por digitação, teclado).
 * - Meses em ordem cronológica (sortOptions={false}).
 * - Proteções: o Combobox limpa o valor ao reselecionar a opção atual, e o antigo
 *   ToggleGroup emitia "" ao clicar no modo já ativo — em ambos os casos o período
 *   ficava vazio e a tela sumia. Valores vazios agora são ignorados.
 */
export default function FiltroPeriodo({ mes, ano, periodo, onMesChange, onAnoChange, onPeriodoChange }) {
  // Ano atual −2 até +2, garantindo que o ano selecionado esteja sempre na lista
  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    const lista = new Set(Array.from({ length: 5 }, (_, i) => atual - 2 + i));
    const anoNum = parseInt(ano);
    if (Number.isFinite(anoNum)) lista.add(anoNum);
    return [...lista].sort((a, b) => a - b).map((a) => ({ value: String(a), label: String(a) }));
  }, [ano]);

  const mesValor = mes ? String(mes).padStart(2, "0") : "";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {periodo === "mensal" && (
        <Combobox
          options={MESES}
          value={mesValor}
          onChange={(v) => { if (v && v !== mesValor) onMesChange(v); }}
          placeholder="Mês"
          emptyText="Mês não encontrado."
          sortOptions={false}
          className="w-40"
        />
      )}

      <Combobox
        options={anos}
        value={String(ano)}
        onChange={(v) => { if (v && v !== String(ano)) onAnoChange(v); }}
        placeholder="Ano"
        emptyText="Ano não encontrado."
        sortOptions={false}
        className="w-28"
      />

      <AbasSegmentadas
        ariaLabel="Modo do período"
        tamanho="sm"
        abas={MODOS}
        valor={periodo}
        onChange={onPeriodoChange}
      />
    </div>
  );
}

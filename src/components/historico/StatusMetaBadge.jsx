import React from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

export default function StatusMetaBadge({ realizadoAcumulado, metaAcumulada, onClick }) {
  // Calcular IRM (Índice de Ritmo de Meta)
  const irm = metaAcumulada > 0 ? realizadoAcumulado / metaAcumulada : 0;
  
  // Definir status baseado no IRM
  let status = "abaixo";
  let cor = "bg-red-500";
  let texto = "ABAIXO DA META";
  let icone = <TrendingDown className="w-4 h-4" />;
  
  if (irm > 1.05) {
    status = "acima";
    cor = "bg-green-500";
    texto = "ACIMA DA META";
    icone = <TrendingUp className="w-4 h-4" />;
  } else if (irm >= 0.95 && irm <= 1.05) {
    status = "na_media";
    cor = "bg-yellow-500";
    texto = "NA MÉDIA";
    icone = <Minus className="w-4 h-4" />;
  }
  
  const percentual = ((irm - 1) * 100).toFixed(1);
  
  return (
    <button
      onClick={onClick}
      className={`${cor} text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-md sm:shadow-lg shrink-0`}
    >
      <div className="shrink-0 hidden sm:block">{icone}</div>
      <div className="flex flex-col items-start text-left leading-tight">
        <span>{texto}</span>
        <span className="text-[10px] sm:text-xs opacity-90 font-normal">
          {percentual > 0 ? "+" : ""}{percentual}% prev.
        </span>
      </div>
      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 ml-1 opacity-70 shrink-0" />
    </button>
  );
}
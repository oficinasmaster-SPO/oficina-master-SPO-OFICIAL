import React from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

/**
 * Tooltip padronizado para métricas e cards.
 * Estilo solicitado: fundo branco, texto preto, outline preto 2px.
 */
export default function InfoTooltip({ content, children, side = "top", sideOffset = 6, maxW = 300 }) {
  if (!content) return children;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          className="bg-white text-black border-2 border-black rounded-md px-3 py-2 text-[11px] leading-relaxed shadow-xl font-medium"
          style={{ maxWidth: maxW }}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
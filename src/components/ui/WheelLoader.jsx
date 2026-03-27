import React from 'react';
import { cn } from "@/lib/utils";

export default function WheelLoader({ className, size = 'md', text = "Carregando..." }) {
  // Fixado em um tamanho padrão w-24 h-24 independente da prop para manter a consistência em todas as telas
  const FIXED_SIZE = "w-24 h-24";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <style>
        {`
          @keyframes speed-wobble {
            0% { transform: translateX(0px) translateY(0px); }
            25% { transform: translateX(-2px) translateY(-1px); }
            50% { transform: translateX(2px) translateY(1px); }
            75% { transform: translateX(-1px) translateY(1px); }
            100% { transform: translateX(0px) translateY(0px); }
          }
          @keyframes wheel-spin-center {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }
          .animate-speed-wobble {
            animation: speed-wobble 0.15s linear infinite;
          }
          .animate-wheel-spin-center {
            animation: wheel-spin-center 0.6s linear infinite;
          }
        `}
      </style>
      
      {/* Container principal com a trepidação de velocidade que leva as duas imagens juntas */}
      <div className={cn(FIXED_SIZE, "animate-speed-wobble relative flex items-center justify-center opacity-90")}>
        {/* Círculo externo de velocidade */}
        <img 
          src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/b2b751fae_WhatsAppImage2026-03-25at174758-Editadojpg.jpeg" 
          alt="" 
          className="w-full h-full object-contain absolute inset-0 mix-blend-multiply"
        />
        {/* Roda interna girando (Ajustada a posição para caber exatamente dentro do círculo de velocidade) */}
        <img 
          src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/2e665ced6_Designsemnome19.png" 
          alt="Carregando..." 
          className="w-[55%] h-[55%] object-contain absolute top-[50%] left-[58%] animate-wheel-spin-center mix-blend-multiply"
        />
      </div>
      {text && (
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-widest">{text}</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </span>
        </div>
      )}
    </div>
  );
}
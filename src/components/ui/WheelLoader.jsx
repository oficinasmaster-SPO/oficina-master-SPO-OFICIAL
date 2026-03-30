import React from 'react';
import { cn } from "@/lib/utils";

export default function WheelLoader({ className, size = 'md', text = "Carregando..." }) {
  // Tamanho padronizado para a logo horizontal ignorando a prop "size"
  const standardSize = "w-48 h-20";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <style>
        {`
          @keyframes flip-horizontal {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
          }
          .animate-flip-horizontal {
            animation: flip-horizontal 1.5s infinite cubic-bezier(0.4, 0.0, 0.2, 1);
            transform-style: preserve-3d;
          }
        `}
      </style>
      <div className={cn(standardSize, "relative perspective-[1000px]")}>
        <img 
          src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/b4c49b931_Horizontal_Fundo_Claro.png" 
          alt="Carregando..." 
          className="w-full h-full object-contain animate-flip-horizontal drop-shadow-lg"
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
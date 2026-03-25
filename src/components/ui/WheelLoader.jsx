import React from 'react';
import { cn } from "@/lib/utils";

export default function WheelLoader({ className, size = 'md', text = "Carregando..." }) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <style>
        {`
          @keyframes wheel-bounce {
            0% { transform: translateX(-5px) translateY(0px); }
            25% { transform: translateX(0px) translateY(-2px); }
            50% { transform: translateX(5px) translateY(0px); }
            75% { transform: translateX(0px) translateY(2px); }
            100% { transform: translateX(-5px) translateY(0px); }
          }
          @keyframes wheel-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-wheel-bounce {
            animation: wheel-bounce 0.4s ease-in-out infinite;
          }
          .animate-wheel-spin {
            animation: wheel-spin 0.6s linear infinite;
          }
        `}
      </style>
      {/* Container com trepidação */}
      <div className={cn(sizeClasses[size], "animate-wheel-bounce opacity-80 relative")}>
        {/* Camada estática para as linhas ficarem paradas na horizontal */}
        <img 
          src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/d6da73d80_corrida.png" 
          alt="" 
          className="w-full h-full object-contain absolute inset-0"
        />
        {/* Camada que gira, isolada com uma máscara redonda focada na roda central */}
        <img 
          src="https://media.base44.com/images/public/69540822472c4a70b54d47aa/d6da73d80_corrida.png" 
          alt="Carregando..." 
          className="w-full h-full animate-wheel-spin object-contain absolute inset-0"
          style={{ clipPath: 'circle(40% at 50% 50%)' }}
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
import React from 'react';
import { cn } from "@/lib/utils";

const IMG_URL = "https://media.base44.com/images/public/69540822472c4a70b54d47aa/dfa20199e_corrida.png";

export default function WheelLoader({ className, text = "Carregando..." }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <style>{`
        @keyframes inner-wheel-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes speed-shake {
          0%   { transform: translateX(0px)  translateY(0px); }
          20%  { transform: translateX(-3px) translateY(-1px); }
          40%  { transform: translateX(3px)  translateY(1px); }
          60%  { transform: translateX(-2px) translateY(1px); }
          80%  { transform: translateX(2px)  translateY(-1px); }
          100% { transform: translateX(0px)  translateY(0px); }
        }
        .wheel-speed-shake {
          animation: speed-shake 0.12s linear infinite;
        }
        .wheel-inner-spin {
          animation: inner-wheel-spin 0.7s linear infinite;
          transform-origin: center center;
        }
      `}</style>

      {/* Tamanho fixo: nunca muda entre telas */}
      <div className="w-28 h-28 relative wheel-speed-shake flex items-center justify-center">
        
        {/* Imagem base — estática (linhas de velocidade + aro externo ficam parados) */}
        <img
          src={IMG_URL}
          alt=""
          className="w-full h-full object-contain absolute inset-0"
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* Imagem de cima — apenas a roda interna gira via clipPath circular centralizado */}
        <img
          src={IMG_URL}
          alt="Carregando..."
          className="w-full h-full object-contain absolute inset-0 wheel-inner-spin"
          style={{
            mixBlendMode: 'multiply',
            /* clip na área da roda interna — ajustado para o centro-direita da imagem */
            clipPath: 'circle(27% at 64% 50%)',
          }}
        />
      </div>

      {text && (
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-slate-600 uppercase tracking-widest">{text}</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}
    </div>
  );
}
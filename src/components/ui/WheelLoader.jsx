import React from 'react';
import { cn } from "@/lib/utils";

const OUTER_IMG = "https://media.base44.com/images/public/69540822472c4a70b54d47aa/b2b751fae_WhatsAppImage2026-03-25at174758-Editadojpg.jpeg";
const INNER_IMG = "https://media.base44.com/images/public/69540822472c4a70b54d47aa/2e665ced6_Designsemnome19.png";

export default function WheelLoader({ className, text = "Carregando..." }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <style>{`
        @keyframes inner-wheel-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes speed-shake {
          0%   { transform: translateX(0px)  translateY(0px); }
          20%  { transform: translateX(-2px) translateY(-1px); }
          40%  { transform: translateX(2px)  translateY(1px); }
          60%  { transform: translateX(-1px) translateY(1px); }
          80%  { transform: translateX(1px)  translateY(-1px); }
          100% { transform: translateX(0px)  translateY(0px); }
        }
        .wheel-speed-shake {
          animation: speed-shake 0.15s linear infinite;
        }
        .wheel-inner-spin {
          animation: inner-wheel-spin 0.7s linear infinite;
        }
      `}</style>

      {/* Tamanho fixo: nunca muda entre telas */}
      <div className="w-28 h-28 relative wheel-speed-shake opacity-90">
        
        {/* Imagem do aro externo com linhas de velocidade (estática na rotação, apenas treme) */}
        <img
          src={OUTER_IMG}
          alt=""
          className="w-full h-full object-contain absolute inset-0"
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* Imagem da roda interna (gira constantemente) */}
        <img
          src={INNER_IMG}
          alt="Carregando..."
          className="w-[60%] h-[60%] object-contain absolute wheel-inner-spin"
          style={{
            top: '50%',
            left: '58.5%', /* Ajustado para encaixar perfeitamente no espaço do aro externo */
            mixBlendMode: 'multiply',
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
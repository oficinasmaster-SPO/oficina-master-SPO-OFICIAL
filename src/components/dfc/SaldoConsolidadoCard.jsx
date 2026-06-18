import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, TrendingDown, ArrowRight, ArrowLeft } from "lucide-react";

export default function SaldoConsolidadoCard({ saldoInicial, saldoAtual, mes, fmt, onVerDetalhe }) {
  const [verAtual, setVerAtual] = useState(false);

  const diff = saldoAtual - saldoInicial;
  const positivo = saldoAtual >= 0;

  return (
    <Card className={`border-2 transition-all ${verAtual
      ? (positivo ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50")
      : "border-gray-200 bg-white"}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Lado esquerdo — info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-gray-700">
                {verAtual ? "Saldo Atual do Mês" : "Saldo Inicial do Mês"}
              </p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${verAtual
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-500"}`}>
                {verAtual ? "hoje" : "início do mês"}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {verAtual
                ? `Inicial ± entradas e saídas do mês`
                : `Quanto havia no caixa/banco em 01/${mes}`}
            </p>
            {verAtual && diff !== 0 && (
              <p className={`text-xs mt-1 font-medium ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {diff >= 0 ? "▲" : "▼"} {fmt(Math.abs(diff))} em relação ao início
              </p>
            )}
          </div>

          {/* Lado direito — valor + ações */}
          <div className="flex items-center gap-2 shrink-0">
            {verAtual ? (
              <>
                {positivo
                  ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                  : <TrendingDown className="w-5 h-5 text-red-600" />}
                <p className={`text-xl font-bold ${positivo ? "text-emerald-700" : "text-red-700"}`}>
                  {fmt(saldoAtual)}
                </p>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-500">R$</span>
                <div className="w-44 text-right font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                  {saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onVerDetalhe}
                  className="shrink-0"
                  title="Detalhar saldo inicial por banco, máquina e caixa">
                  <Eye className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Botão toggle */}
            <Button
              variant={verAtual ? "outline" : "default"}
              size="sm"
              onClick={() => setVerAtual(v => !v)}
              className={`shrink-0 text-xs gap-1 ${verAtual ? "" : "bg-gray-800 hover:bg-gray-700 text-white"}`}>
              {verAtual ? (
                <><ArrowLeft className="w-3 h-3" /> Início</>
              ) : (
                <>Como está hoje <ArrowRight className="w-3 h-3" /></>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
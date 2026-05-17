import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default function BudgetSummaryCards({ calculado, metas }) {
  if (!metas.length) return null;

  const faturamento = calculado.faturamento_meta || 0;
  const totalMeta = calculado.total_meta || 0;
  const totalRealizado = Object.values(calculado.por_categoria || {}).reduce((sum, cat) => sum + (cat.realizado || 0), 0);
  const totalDiferenca = totalMeta - totalRealizado;
  const variacao = totalMeta > 0 ? (totalDiferenca / totalMeta) * 100 : 0;

  const isPositive = totalDiferenca >= 0;
  const statusColor = variacao > 5 ? "from-green-500 to-emerald-600" : variacao > -5 ? "from-yellow-500 to-amber-600" : "from-red-500 to-rose-600";
  const statusIcon = isPositive ? <TrendingUp className="w-10 h-10 opacity-20" /> : <TrendingDown className="w-10 h-10 opacity-20" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Card Meta Faturamento */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Meta Faturamento</p>
              <p className="text-3xl font-bold text-blue-900">{formatCurrency(faturamento)}</p>
              <p className="text-xs text-blue-600 mt-2">Base para cálculos %</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Total Gasto */}
      <Card className={`bg-gradient-to-br ${statusColor} text-white`}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Despesas Totais</p>
              <p className="text-3xl font-bold">{formatCurrency(totalRealizado)}</p>
              <p className={`text-xs mt-2 ${isPositive ? 'text-green-100' : 'text-red-100'}`}>
                {isPositive ? '✅ Sob controle' : '❌ Acima do orçamento'}
              </p>
            </div>
            {statusIcon}
          </div>
        </CardContent>
      </Card>

      {/* Card Diferença */}
      <Card className={`bg-gradient-to-br ${isPositive ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Diferença (Economia/Excesso)</p>
              <p className={`text-3xl font-bold ${isPositive ? 'text-emerald-900' : 'text-red-900'}`}>
                {isPositive ? '+' : ''}{formatCurrency(totalDiferenca)}
              </p>
              <p className="text-xs text-gray-600 mt-2">{formatNumber(variacao, 1)}% da meta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Variação Visual */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div>
            <p className="text-sm font-medium text-purple-700 mb-3">Progresso Geral</p>
            <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${totalDiferenca >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: Math.min(Math.abs((totalRealizado / totalMeta) * 100), 100) + '%' }}
              />
            </div>
            <p className="text-xs text-purple-600 mt-2 text-right">
              {formatNumber((totalRealizado / totalMeta) * 100, 0)}% da meta
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
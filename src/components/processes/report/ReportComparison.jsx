import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

const maturidadeLevels = [
  { nivel: 0, label: "Inexistente" },
  { nivel: 1, label: "Inicial" },
  { nivel: 2, label: "Documentado" },
  { nivel: 3, label: "Implementado" },
  { nivel: 4, label: "Gerenciado" },
  { nivel: 5, label: "Otimizado" }
];

export default function ReportComparison({ previousReport, currentData }) {
  if (!previousReport) return null;

  const prevMaturity = previousReport.nivel_maturidade || 0;
  const currMaturity = currentData.nivel_maturidade || 0;
  const maturityDiff = currMaturity - prevMaturity;

  const prevNCs = previousReport.nao_conformidades?.length || 0;
  const currNCs = currentData.nao_conformidades?.length || 0;
  const ncDiff = currNCs - prevNCs;

  const prevActions = previousReport.plano_acao?.length || 0;
  const currActions = currentData.plano_acao?.length || 0;

  const completedActions = previousReport.plano_acao?.filter(a => a.status === 'Concluído').length || 0;

  const TrendIcon = ({ value, invertColors = false }) => {
    if (value > 0) {
      return <TrendingUp className={`w-4 h-4 ${invertColors ? 'text-red-500' : 'text-green-500'}`} />;
    } else if (value < 0) {
      return <TrendingDown className={`w-4 h-4 ${invertColors ? 'text-green-500' : 'text-red-500'}`} />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Comparativo com Visita Anterior
        </CardTitle>
        <p className="text-xs text-gray-600">
          Última visita: {new Date(previousReport.data).toLocaleDateString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Maturidade */}
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Maturidade</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold">{prevMaturity}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-blue-600">{currMaturity}</span>
              <TrendIcon value={maturityDiff} />
            </div>
            {maturityDiff !== 0 && (
              <Badge className={maturityDiff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {maturityDiff > 0 ? '+' : ''}{maturityDiff} nível(is)
              </Badge>
            )}
          </div>

          {/* Não Conformidades */}
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Não Conformidades</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold">{prevNCs}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-blue-600">{currNCs}</span>
              <TrendIcon value={ncDiff} invertColors />
            </div>
            {ncDiff !== 0 && (
              <Badge className={ncDiff < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {ncDiff > 0 ? '+' : ''}{ncDiff}
              </Badge>
            )}
          </div>

          {/* Ações Anteriores */}
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Ações Concluídas</p>
            <div className="text-lg font-bold text-green-600">
              {completedActions}/{prevActions}
            </div>
            <Badge className="bg-green-100 text-green-700">
              {prevActions > 0 ? Math.round((completedActions/prevActions)*100) : 0}%
            </Badge>
          </div>

          {/* Evolução */}
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 mb-1">Status Geral</p>
            <div className="text-sm font-semibold">
              {maturityDiff > 0 && ncDiff <= 0 ? (
                <span className="text-green-600">✅ Evoluindo</span>
              ) : maturityDiff < 0 || ncDiff > 0 ? (
                <span className="text-red-600">⚠️ Atenção</span>
              ) : (
                <span className="text-yellow-600">➡️ Estável</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
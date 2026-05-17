import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetVariationReport({ metas, calculado }) {
  const report = useMemo(() => {
    if (!metas.length) return { exceedido: [], economizado: [], ranking: [] };

    const items = metas.map(meta => {
      const calc = calculado.por_categoria[meta.id] || {};
      const meta_rs = meta.meta_percentual 
        ? (meta.meta_percentual / 100) * (meta.faturamento_meta_rs || 0)
        : meta.meta_fixa_rs;

      return {
        item: meta.item,
        categoria: meta.categoria,
        tipo: meta.tipo || "despesa",
        responsavel: meta.responsavel_nome || 'Sem responsável',
        meta_rs,
        realizado: calc.realizado || 0,
        diferenca: calc.diferenca || 0,
        variacao: calc.variacao || 0,
        status: calc.status
      };
    });

    const exceedido = items.filter(i => i.realizado > i.meta_rs * 1.05).sort((a, b) => b.realizado - a.meta_rs - (a.meta_rs - a.realizado));
    const economizado = items.filter(i => i.diferenca > 0 && i.realizado <= i.meta_rs * 0.95).sort((a, b) => b.diferenca - a.diferenca);
    const ranking = items.sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao)).slice(0, 5);

    return { exceedido, economizado, ranking };
  }, [metas, calculado]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Categorias que Ultrapassaram */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            ⚠️ Ultrapassaram o Orçamento ({report.exceedido.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.exceedido.length === 0 ? (
            <p className="text-sm text-red-700">✅ Nenhuma categoria ultrapassou o orçamento!</p>
          ) : (
            <div className="space-y-3">
              {report.exceedido.map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${item.tipo === 'despesa' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.tipo === 'despesa' ? '↑ Despesa' : '↓ Receita'}
                      </span>
                      <h4 className="font-semibold text-red-900">{item.item}</h4>
                    </div>
                    <Badge className="bg-red-600">{formatNumber(item.variacao, 1)}%</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{item.categoria} · {item.responsavel}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-50 p-2 rounded">
                      <p className="text-gray-600">Meta</p>
                      <p className="font-bold text-red-900">{formatCurrency(item.meta_rs)}</p>
                    </div>
                    <div className="bg-red-100 p-2 rounded">
                      <p className="text-gray-600">Realizado</p>
                      <p className="font-bold text-red-900">{formatCurrency(item.realizado)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-red-700 mt-2 font-semibold">
                    Excesso: {formatCurrency(item.realizado - item.meta_rs)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorias com Economia */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <TrendingDown className="w-5 h-5 text-green-600" />
            ✅ Economizado ({report.economizado.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.economizado.length === 0 ? (
            <p className="text-sm text-green-700">Nenhuma categoria com economia significativa.</p>
          ) : (
            <div className="space-y-3">
              {report.economizado.map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${item.tipo === 'despesa' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.tipo === 'despesa' ? '↑ Despesa' : '↓ Receita'}
                      </span>
                      <h4 className="font-semibold text-green-900">{item.item}</h4>
                    </div>
                    <Badge className="bg-green-600">-{formatNumber(Math.abs(item.variacao), 1)}%</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{item.categoria} · {item.responsavel}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-gray-600">Meta</p>
                      <p className="font-bold text-green-900">{formatCurrency(item.meta_rs)}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded">
                      <p className="text-gray-600">Realizado</p>
                      <p className="font-bold text-green-900">{formatCurrency(item.realizado)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-2 font-semibold">
                    Economia: {formatCurrency(item.meta_rs - item.realizado)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking de Maiores Desvios */}
      <Card className="md:col-span-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            🎯 Top 5 Maiores Desvios (Variações)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.ranking.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-700">{idx + 1}.</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${item.tipo === 'despesa' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.tipo === 'despesa' ? '↑ Desp' : '↓ Rec'}
                    </span>
                    <p className="text-sm font-semibold text-blue-900">{item.item}</p>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">{item.categoria} · {item.responsavel}</p>
                </div>
                <div className="text-right">
                  <Badge className={item.realizado > item.meta_rs ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                    {item.realizado > item.meta_rs ? '+' : '-'}{formatNumber(Math.abs(item.variacao), 1)}%
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">{formatCurrency(Math.abs(item.diferenca))}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
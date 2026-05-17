import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency, formatNumber } from "../utils/formatters";

export default function BudgetResponsibilityMatrix({ metas, calculado }) {
  if (!metas.length) return null;

  // Agrupar por responsável
  const porResponsavel = {};
  metas.forEach(meta => {
    const responsavel = meta.responsavel_nome || "Sem responsável";
    if (!porResponsavel[responsavel]) {
      porResponsavel[responsavel] = [];
    }
    porResponsavel[responsavel].push(meta);
  });

  // Calcular alertas por responsável
  const alertas = Object.entries(porResponsavel).map(([responsavel, items]) => {
    const totalMeta = items.reduce((sum, m) => {
      const m_rs = m.meta_percentual 
        ? (m.meta_percentual / 100) * (m.faturamento_meta_rs || 0)
        : m.meta_fixa_rs;
      return sum + m_rs;
    }, 0);

    const totalRealizado = items.reduce((sum, m) => {
      const calc = calculado.por_categoria[m.id] || {};
      return sum + (calc.realizado || 0);
    }, 0);

    const emAlerta = items.filter(m => {
      const calc = calculado.por_categoria[m.id] || {};
      return calc.realizado > ((() => {
        const m_rs = m.meta_percentual 
          ? (m.meta_percentual / 100) * (m.faturamento_meta_rs || 0)
          : m.meta_fixa_rs;
        return m_rs;
      })()) * 1.05;
    }).length;

    return {
      responsavel,
      items,
      totalMeta,
      totalRealizado,
      emAlerta,
      variacao: totalMeta > 0 ? ((totalMeta - totalRealizado) / totalMeta) * 100 : 0
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          👤 Responsáveis & Ações
          {alertas.some(a => a.emAlerta > 0) && (
            <Badge className="bg-red-100 text-red-800">
              {alertas.reduce((sum, a) => sum + a.emAlerta, 0)} em alerta
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alertas.map((alerta, idx) => (
            <div key={idx} className={`p-4 rounded-lg border-2 ${alerta.emAlerta > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{alerta.responsavel}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {alerta.items.length} {alerta.items.length === 1 ? 'categoria' : 'categorias'} sob responsabilidade
                  </p>
                </div>
                <div className="text-right">
                  {alerta.emAlerta > 0 ? (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-bold text-lg">{alerta.emAlerta}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold text-lg">OK</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid de Categorias */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {alerta.items.map((item, i) => {
                  const calc = calculado.por_categoria[item.id] || {};
                  const m_rs = item.meta_percentual 
                    ? (item.meta_percentual / 100) * (item.faturamento_meta_rs || 0)
                    : item.meta_fixa_rs;
                  const isOver = calc.realizado > m_rs * 1.05;

                  return (
                    <div key={i} className={`p-2 rounded text-sm ${isOver ? 'bg-red-100 border border-red-300' : 'bg-white border border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">{item.item}</span>
                        <span className={`text-lg font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                          {calc.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatCurrency(calc.realizado || 0)} / {formatCurrency(m_rs)}
                      </p>
                      {isOver && (
                        <p className="text-xs text-red-700 font-semibold mt-1">
                          ⚠️ {formatNumber(Math.abs(calc.variacao), 1)}% acima
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="bg-white p-2 rounded border-l-4" style={{ borderColor: alerta.emAlerta > 0 ? '#dc2626' : '#16a34a' }}>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Meta Total: <strong className="text-gray-900">{formatCurrency(alerta.totalMeta)}</strong></span>
                  <span>Realizado: <strong className="text-gray-900">{formatCurrency(alerta.totalRealizado)}</strong></span>
                  <span>Variação: <strong className={alerta.variacao > 0 ? 'text-green-700' : 'text-red-700'}>{alerta.variacao > 0 ? '+' : ''}{formatNumber(alerta.variacao, 1)}%</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
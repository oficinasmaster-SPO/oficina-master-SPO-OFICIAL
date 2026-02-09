import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Target, Sparkles } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import RecordDetails from "./RecordDetails";

export default function RecordCard({ 
  record, 
  employee,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onFeedback
}) {
  const achievementPercentage = record.projected_total > 0 
    ? (record.achieved_total / record.projected_total) * 100 
    : 0;

  const metaAchieved = achievementPercentage >= 100;
  const hasFaturamento = (record.revenue_total > 0 || record.achieved_total > 0);

  return (
    <Card className={`hover:shadow-lg transition-all ${
      !hasFaturamento ? 'border-l-4 border-gray-400 bg-gray-50/30' :
      metaAchieved ? 'border-l-4 border-green-500 bg-green-50/30' : 'border-l-4 border-orange-400 bg-orange-50/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Data */}
            <div className="text-center min-w-[70px]">
              <p className="text-3xl font-bold text-gray-900">
                {new Date(record.reference_date).getDate()}
              </p>
              <p className="text-xs text-gray-500 uppercase">
                {new Date(record.reference_date).toLocaleDateString('pt-BR', { month: 'short' })}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(record.reference_date).getFullYear()}
              </p>
            </div>

            {/* Info Principal */}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">
                {new Date(record.reference_date).toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: '2-digit', 
                  month: 'long'
                })}
              </p>
              {employee && (
                <p className="text-xs text-gray-600">
                  {employee.full_name} - {employee.position}
                </p>
              )}

              {/* Indicador de Meta */}
              <div className="flex items-center gap-2 mt-2">
                {!hasFaturamento ? (
                  <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-400 text-white">
                    Sem Faturamento
                  </div>
                ) : (
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    metaAchieved 
                      ? 'bg-green-500 text-white' 
                      : achievementPercentage >= 70 
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                  }`}>
                    {metaAchieved ? '✓ Meta Atingida' : `${achievementPercentage.toFixed(0)}% da meta`}
                  </div>
                )}
              </div>
            </div>

            {/* Valores - Compacto */}
            <div className="flex gap-3">
              <div className="text-center bg-blue-50 px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                <p className="text-xs text-blue-700 mb-1">Previsto</p>
                <p className="text-xl font-bold text-blue-600">
                  R$ {formatCurrency(record.projected_total || 0)}
                </p>
                {(!record.projected_total || record.projected_total === 0) && (
                  <p className="text-xs text-orange-500 mt-1">Meta não definida</p>
                )}
              </div>
              <div className="text-center bg-white px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                <p className="text-xs text-purple-700 mb-1">Realizado</p>
                <p className={`text-xl font-bold ${metaAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                  R$ {formatCurrency(record.achieved_total)}
                </p>
              </div>
            </div>

            {/* Botões Expandir e Feedback */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFeedback(record)}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-300"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Feedback
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleExpand(record.id)}
                className="text-gray-600 hover:text-gray-900"
              >
                {isExpanded ? (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Fechar
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-1" />
                    Detalhes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Detalhes Expandidos */}
        {isExpanded && (
          <RecordDetails 
            record={record}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </CardContent>
    </Card>
  );
}
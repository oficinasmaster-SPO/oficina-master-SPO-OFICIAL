import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSharedData } from "./SharedDataProvider";
import { Target, TrendingUp, DollarSign, Users, Edit3, RefreshCw, Loader2 } from "lucide-react";

// Componente que exibe Metas em qualquer tela
export default function GoalsDataCard({ 
  compact = false,
  className = "" 
}) {
  const { goalsData, loadingStates, refreshData } = useSharedData();

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-';
    return `${value.toFixed(1)}%`;
  };

  const fields = [
    { key: 'revenue_parts', label: 'Meta Peças', format: formatCurrency, icon: DollarSign },
    { key: 'revenue_services', label: 'Meta Serviços', format: formatCurrency, icon: DollarSign },
    { key: 'average_ticket', label: 'Ticket Médio', format: formatCurrency, icon: TrendingUp },
    { key: 'customer_volume', label: 'Volume Clientes', format: (v) => v || 0, icon: Users },
    { key: 'profitability_percentage', label: 'Rentabilidade %', format: formatPercent, icon: TrendingUp },
    { key: 'profit_percentage', label: 'Lucro %', format: formatPercent, icon: TrendingUp },
  ];

  if (loadingStates.goals) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  const hasData = goalsData && (goalsData.revenue_parts || goalsData.revenue_services);

  if (!hasData) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="py-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 mb-4">Metas não definidas</p>
          <Link to={createPageUrl("GestaoMetas")}>
            <Button variant="outline" size="sm">
              <Edit3 className="w-4 h-4 mr-2" />
              Definir Metas
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">Metas do Mês</span>
          </div>
          <Link to={createPageUrl("GestaoMetas")}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit3 className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fields.slice(0, 4).map(field => (
            <div key={field.key} className="text-center">
              <p className="text-xs text-gray-500">{field.label}</p>
              <p className="font-semibold text-gray-900">{field.format(goalsData[field.key])}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-green-600" />
            Metas Mensais
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {goalsData.month || 'Atual'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => refreshData('goals')} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("GestaoMetas")}>
              <Button variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map(field => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{field.label}</span>
                </div>
                <p className="font-semibold text-gray-900">{field.format(goalsData[field.key])}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente inline para exibir um único valor das metas
export function GoalsValue({ field, format, fallback = '-', className = "" }) {
  const { goalsData, loadingStates } = useSharedData();

  if (loadingStates.goals) {
    return <span className={`animate-pulse bg-gray-200 rounded ${className}`}>...</span>;
  }

  const value = goalsData?.[field];
  const displayValue = value !== undefined && value !== null 
    ? (format ? format(value) : value) 
    : fallback;

  return <span className={className}>{displayValue}</span>;
}
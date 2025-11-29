import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSharedData } from "./SharedDataProvider";
import { Calculator, TrendingUp, Users, Clock, DollarSign, Edit3, RefreshCw, Loader2 } from "lucide-react";

// Componente que exibe dados do TCMP² em qualquer tela
export default function TCMP2DataCard({ 
  showAll = false,        // Mostrar todos os campos
  compact = false,        // Versão compacta
  fields = [],            // Campos específicos a mostrar
  className = "" 
}) {
  const { tcmp2Data, workshopData, isLoading, loadingStates, refreshData } = useSharedData();

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

  const allFields = [
    { key: 'ideal_hour_value', label: 'Valor Hora Ideal', format: formatCurrency, icon: Clock },
    { key: 'current_hour_value', label: 'Valor Hora Atual', format: formatCurrency, icon: Clock },
    { key: 'productive_technicians', label: 'Técnicos Produtivos', format: (v) => v || 0, icon: Users },
    { key: 'monthly_hours', label: 'Horas/Mês', format: (v) => `${v || 219}h`, icon: Clock },
    { key: 'operational_costs', label: 'Custos Operacionais', format: formatCurrency, icon: DollarSign },
    { key: 'people_costs', label: 'Custos com Pessoas', format: formatCurrency, icon: Users },
    { key: 'revenue_total', label: 'Receita Total', format: formatCurrency, icon: TrendingUp },
    { key: 'revenue_parts', label: 'Receita Peças', format: formatCurrency, icon: DollarSign },
    { key: 'revenue_services', label: 'Receita Serviços', format: formatCurrency, icon: DollarSign },
    { key: 'profit_percentage', label: 'Lucro %', format: formatPercent, icon: TrendingUp },
    { key: 'rentability_percentage', label: 'Rentabilidade %', format: formatPercent, icon: TrendingUp },
    { key: 'average_ticket', label: 'Ticket Médio', format: formatCurrency, icon: Calculator },
    { key: 'investment_percentage', label: 'Investimento (I30)', format: formatPercent, icon: Calculator },
    { key: 'revenue_percentage', label: 'Renda (R70)', format: formatPercent, icon: Calculator },
  ];

  const displayFields = fields.length > 0 
    ? allFields.filter(f => fields.includes(f.key))
    : showAll 
      ? allFields 
      : allFields.slice(0, 6);

  const hasData = tcmp2Data && (tcmp2Data.ideal_hour_value || tcmp2Data.revenue_total);

  if (loadingStates.tcmp2 || loadingStates.dre) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="py-8 text-center">
          <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 mb-4">Dados do TCMP² não encontrados</p>
          <Link to={createPageUrl("DRETCMP2")}>
            <Button variant="outline" size="sm">
              <Edit3 className="w-4 h-4 mr-2" />
              Preencher TCMP²
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Dados TCMP²</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => refreshData('tcmp2')} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("DRETCMP2")}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit3 className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayFields.slice(0, 4).map(field => (
            <div key={field.key} className="text-center">
              <p className="text-xs text-gray-500">{field.label}</p>
              <p className="font-semibold text-gray-900">{field.format(tcmp2Data[field.key])}</p>
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
            <Calculator className="w-5 h-5 text-blue-600" />
            Dados do TCMP²
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Fonte: TCMP²
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => refreshData('tcmp2')} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("DRETCMP2")}>
              <Button variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayFields.map(field => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{field.label}</span>
                </div>
                <p className="font-semibold text-gray-900">{field.format(tcmp2Data[field.key])}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente inline para exibir um único valor do TCMP²
export function TCMP2Value({ field, format, fallback = '-', className = "" }) {
  const { tcmp2Data, loadingStates } = useSharedData();

  if (loadingStates.tcmp2) {
    return <span className={`animate-pulse bg-gray-200 rounded ${className}`}>...</span>;
  }

  const value = tcmp2Data?.[field];
  const displayValue = value !== undefined && value !== null 
    ? (format ? format(value) : value) 
    : fallback;

  return <span className={className}>{displayValue}</span>;
}
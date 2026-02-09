import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSharedData } from "./SharedDataProvider";
import { Building2, MapPin, Users, Wrench, Edit3, RefreshCw, Loader2 } from "lucide-react";

// Componente que exibe dados da Oficina em qualquer tela
export default function WorkshopDataCard({ 
  compact = false,
  showFields = ['name', 'city', 'employees_count', 'segment'],
  className = "" 
}) {
  const { workshopData, employees, isLoading, loadingStates, refreshData } = useSharedData();

  const fieldConfig = {
    name: { label: 'Nome', icon: Building2 },
    city: { label: 'Cidade', icon: MapPin },
    state: { label: 'Estado', icon: MapPin },
    employees_count: { label: 'Colaboradores', icon: Users, format: (v) => v || employees.length || 0 },
    segment: { label: 'Segmento', icon: Wrench },
    tax_regime: { label: 'Regime Tributário', icon: Building2 },
    capacidade_atendimento_dia: { label: 'Capacidade/Dia', icon: Wrench },
  };

  if (loadingStates.workshop) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!workshopData?.id) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="py-8 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 mb-4">Oficina não cadastrada</p>
          <Link to={createPageUrl("Cadastro")}>
            <Button variant="outline" size="sm">
              <Edit3 className="w-4 h-4 mr-2" />
              Cadastrar Oficina
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">{workshopData.name}</span>
          </div>
          <Link to={createPageUrl("GestaoOficina")}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit3 className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{workshopData.city}, {workshopData.state}</Badge>
          <Badge variant="outline">{workshopData.employees_count || employees.length} colaboradores</Badge>
          {workshopData.segment && <Badge variant="outline">{workshopData.segment}</Badge>}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-purple-600" />
            Dados da Oficina
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => refreshData('workshop')} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("GestaoOficina")}>
              <Button variant="outline" size="sm">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {showFields.map(fieldKey => {
            const config = fieldConfig[fieldKey];
            if (!config) return null;
            const Icon = config.icon;
            const value = config.format 
              ? config.format(workshopData[fieldKey]) 
              : workshopData[fieldKey] || '-';
            
            return (
              <div key={fieldKey} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{config.label}</span>
                </div>
                <p className="font-semibold text-gray-900">{value}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente inline para exibir um único valor da oficina
export function WorkshopValue({ field, format, fallback = '-', className = "" }) {
  const { workshopData, loadingStates } = useSharedData();

  if (loadingStates.workshop) {
    return <span className={`animate-pulse bg-gray-200 rounded ${className}`}>...</span>;
  }

  const value = workshopData?.[field];
  const displayValue = value !== undefined && value !== null 
    ? (format ? format(value) : value) 
    : fallback;

  return <span className={className}>{displayValue}</span>;
}
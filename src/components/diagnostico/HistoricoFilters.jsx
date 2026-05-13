import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

const DIAGNOSTIC_TYPES = [
  { value: 'entrepreneur_diagnostic', label: 'Diagnóstico de Empreendedor' },
  { value: 'management_diagnostic', label: 'Diagnóstico Gerencial' },
  { value: 'maturity_collaborative_diagnostic', label: 'Diagnóstico de Maturidade' },
  { value: 'productivity_diagnostic_tcmp2', label: 'Diagnóstico de Produtividade (TCMP2)' },
  { value: 'performance_diagnostic_matrix30', label: 'Diagnóstico de Desempenho (Matriz 30)' },
  { value: 'workload_diagnostic', label: 'Diagnóstico de Carga de Trabalho' },
  { value: 'service_order_diagnostic_r70i30', label: 'Diagnóstico de Ordem de Serviço (R70/I30)' },
  { value: 'disc_behavioral_diagnostic', label: 'Diagnóstico DISC Comportamental' },
  { value: 'debt_analysis_diagnostic', label: 'Diagnóstico de Endividamento' },
  { value: 'gerencial_diagnostic', label: 'Diagnóstico Gerencial (alternativo)' },
  { value: 'commercial_diagnostic', label: 'Diagnóstico Comercial' }
];

export default function HistoricoFilters({ onFilterChange, workshops = [], showCompanyFilter = false }) {
  const [filters, setFilters] = useState({
    company_name: '',
    diagnostic_type: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    const empty = {
      company_name: '',
      diagnostic_type: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(empty);
    onFilterChange(empty);
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-lg">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Filtro Empresa */}
        {showCompanyFilter && (
          <div>
            <Label className="text-xs mb-2 block font-medium">Empresa</Label>
            <Select value={filters.company_name} onValueChange={(value) => handleChange('company_name', value)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas</SelectItem>
                {workshops.map(ws => (
                  <SelectItem key={ws.id} value={ws.name}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro Tipo Diagnóstico */}
        <div>
          <Label className="text-xs mb-2 block font-medium">Tipo de Diagnóstico</Label>
          <Select value={filters.diagnostic_type} onValueChange={(value) => handleChange('diagnostic_type', value)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              {DIAGNOSTIC_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data From */}
        <div>
          <Label className="text-xs mb-2 block font-medium">De</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Data To */}
        <div>
          <Label className="text-xs mb-2 block font-medium">Até</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-2 items-end">
          <Button
            onClick={handleApply}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            Aplicar
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
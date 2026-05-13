import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useDiagnosticFrequency } from '@/components/hooks/useDiagnosticFrequency';

const DIAGNOSTIC_TYPES = [
  { id: 'entrepreneur_diagnostic', label: 'Diagnóstico de Empreendedor', hasIA: true },
  { id: 'management_diagnostic', label: 'Diagnóstico Gerencial', hasIA: true },
  { id: 'maturity_collaborative_diagnostic', label: 'Diagnóstico de Maturidade Colaborador', hasIA: true },
  { id: 'productivity_diagnostic_tcmp2', label: 'Diagnóstico de Produtividade (TCMP2)', hasIA: false },
  { id: 'performance_diagnostic_matrix30', label: 'Diagnóstico de Desempenho (Matriz 30)', hasIA: false },
  { id: 'workload_diagnostic', label: 'Diagnóstico de Carga de Trabalho', hasIA: false },
  { id: 'service_order_diagnostic_r70i30', label: 'Diagnóstico de Ordem de Serviço (R70/I30)', hasIA: false },
  { id: 'disc_behavioral_diagnostic', label: 'Diagnóstico DISC Comportamental', hasIA: false },
  { id: 'debt_analysis_diagnostic', label: 'Diagnóstico de Endividamento', hasIA: true },
  { id: 'gerencial_diagnostic', label: 'Diagnóstico Gerencial (alternativo)', hasIA: true },
  { id: 'commercial_diagnostic', label: 'Diagnóstico Comercial', hasIA: true }
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensal (30 dias)', daysMin: 30 },
  { value: 'quarterly', label: 'Trimestral (90 dias)', daysMin: 90 },
  { value: 'semester', label: 'Semestral (180 dias)', daysMin: 180 },
  { value: 'annual', label: 'Anual (365 dias)', daysMin: 365 },
  { value: 'unlimited', label: 'Ilimitado', daysMin: 0 }
];

export default function DiagnosticFrequencyManager({ planId }) {
  const { frequencies, isLoading, updateOrCreate, isUpdating } = useDiagnosticFrequency(planId);

  // Mapear frequências para fácil lookup
  const frequencyMap = useMemo(() => {
    const map = {};
    frequencies.forEach(f => {
      map[f.diagnostic_type] = f;
    });
    return map;
  }, [frequencies]);

  const handleFrequencyChange = (diagnosticType, frequencyType) => {
    const selected = FREQUENCY_OPTIONS.find(f => f.value === frequencyType);
    if (!selected) return;

    updateOrCreate(diagnosticType, {
      frequency_type: frequencyType,
      min_days_between_attempts: selected.daysMin,
      max_occurrences_per_period: frequencyType === 'unlimited' ? 999 : 1
    });
  };

  const handleMaxOccurrencesChange = (diagnosticType, value) => {
    const numValue = parseInt(value) || 1;
    updateOrCreate(diagnosticType, {
      max_occurrences_per_period: numValue
    });
  };

  const handleIAToggle = (diagnosticType, enabled) => {
    updateOrCreate(diagnosticType, {
      ia_plan_enabled_for_this_plan: enabled
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Gerenciador de Frequência de Diagnósticos</h3>
        <p className="text-sm text-blue-800">
          Defina com que frequência os clientes podem realizar cada tipo de diagnóstico e se podem usar IA para planos de ação personalizados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {DIAGNOSTIC_TYPES.map(diagnostic => {
          const frequency = frequencyMap[diagnostic.id];
          const frequencyType = frequency?.frequency_type || 'monthly';
          const maxOccurrences = frequency?.max_occurrences_per_period || 1;
          const iaEnabled = frequency?.ia_plan_enabled_for_this_plan || false;
          const hasIA = diagnostic.hasIA;

          return (
            <Card key={diagnostic.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  {/* Funcionalidade */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">Funcionalidade</Label>
                    <p className="font-medium text-sm">{diagnostic.label}</p>
                  </div>

                  {/* Frequência */}
                  <div>
                    <Label htmlFor={`freq-${diagnostic.id}`} className="text-xs text-gray-600 mb-2 block">
                      Frequência
                    </Label>
                    <Select value={frequencyType} onValueChange={(val) => handleFrequencyChange(diagnostic.id, val)}>
                      <SelectTrigger id={`freq-${diagnostic.id}`} disabled={isUpdating}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantidade por período */}
                  <div>
                    <Label htmlFor={`qty-${diagnostic.id}`} className="text-xs text-gray-600 mb-2 block">
                      Qtd/Período
                    </Label>
                    <Input
                      id={`qty-${diagnostic.id}`}
                      type="number"
                      min="1"
                      max="12"
                      value={maxOccurrences}
                      onChange={(e) => handleMaxOccurrencesChange(diagnostic.id, e.target.value)}
                      disabled={frequencyType === 'unlimited' || isUpdating}
                      className="text-sm"
                    />
                  </div>

                  {/* Plano IA */}
                  {hasIA && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-600 mb-2 block">Plano IA</Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={iaEnabled}
                            onCheckedChange={(checked) => handleIAToggle(diagnostic.id, checked)}
                            disabled={isUpdating}
                          />
                          <span className="text-sm text-gray-700">
                            {iaEnabled ? 'Ativado' : 'Desativado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!hasIA && (
                    <div className="text-xs text-gray-500 italic pt-5">
                      Sem suporte a IA
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Salvando alterações...
        </div>
      )}
    </div>
  );
}
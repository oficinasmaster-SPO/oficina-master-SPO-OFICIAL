import React from 'react';
import { AlertCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AttendanceValidationAlert({ validation }) {
  if (!validation.warnings || validation.warnings.length === 0) {
    return null;
  }

  const hasError = validation.warnings.some(w => w.severity === 'error');
  const hasWarning = validation.warnings.some(w => w.severity === 'warning');

  return (
    <Card className={`border-l-4 mb-4 ${hasError ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500 bg-amber-50'}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {hasError ? (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1">
            <h4 className={`text-sm font-semibold ${hasError ? 'text-red-900' : 'text-amber-900'} mb-2`}>
              ⚠️ Validação de Atendimento
            </h4>
            
            <div className="space-y-2.5">
              {validation.warnings.map((warning, idx) => (
                <div key={idx} className={`text-xs ${hasError && warning.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>
                  {warning.severity === 'error' ? (
                    <div className="flex items-start gap-2">
                      <span className="inline-block mt-0.5">🔴</span>
                      <div>
                        <p className="font-medium">LIMITE ESGOTADO</p>
                        <p className="mt-0.5">{warning.message}</p>
                        {validation.rule && (
                          <p className="mt-1 text-[11px] opacity-75">
                            Plano: {validation.rule.plan_id} | Tipo: {validation.rule.attendance_type_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="inline-block mt-0.5">🟠</span>
                      <div>
                        <p className="font-medium">FREQUÊNCIA BAIXA</p>
                        <p className="mt-0.5">{warning.message}</p>
                        {validation.recommendedNextDate && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] opacity-75">
                            <Calendar className="w-3 h-3" />
                            Próxima data ideal: {new Date(validation.recommendedNextDate).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-[11px] mt-2.5 opacity-60 italic">
              Você pode continuar, mas revise a data/plano atentamente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
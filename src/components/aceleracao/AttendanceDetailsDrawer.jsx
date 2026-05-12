import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Calendar, Clock, User, Tag } from 'lucide-react';
import { formatDateTimeBR } from '@/utils/timezone';

export default function AttendanceDetailsDrawer({ open, onOpenChange, attendanceItem, validation }) {
  if (!attendanceItem) return null;

  const hasValidationIssues = validation?.warnings && validation.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Detalhes do Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info básico */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4 pb-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Oficina</span>
                <span className="text-sm font-semibold text-gray-900">{attendanceItem.workshop_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Tipo de Atendimento</span>
                <span className="text-sm font-medium text-gray-900">
                  {attendanceItem.attendance_type_name?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Data</span>
                <span className="text-sm font-semibold text-gray-900">
                  {attendanceItem.data_realizada 
                    ? formatDateTimeBR(attendanceItem.data_realizada) 
                    : attendanceItem.scheduled_date 
                      ? new Date(attendanceItem.scheduled_date).toLocaleDateString('pt-BR')
                      : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Status</span>
                <Badge className={`text-xs ${
                  attendanceItem.status === 'concluido' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {attendanceItem.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Observações Internas */}
          {hasValidationIssues && (
            <Card className="border-l-4 border-l-red-500 bg-red-50">
              <CardContent className="pt-4 pb-4 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-900">
                  <AlertCircle className="w-4 h-4" />
                  Observações Internas
                </h4>

                <div className="space-y-2.5">
                  {validation.warnings.map((warning, idx) => (
                    <div key={idx} className={`text-xs ${warning.severity === 'error' ? 'text-red-800' : 'text-amber-800'}`}>
                      {warning.severity === 'error' ? (
                        <div className="flex gap-2">
                          <span className="text-lg">🔴</span>
                          <div>
                            <p className="font-medium">LIMITE ESGOTADO</p>
                            <p className="mt-1">{warning.message}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <span className="text-lg">🟠</span>
                          <div>
                            <p className="font-medium">FREQUÊNCIA BAIXA</p>
                            <p className="mt-1">{warning.message}</p>
                            {validation.recommendedNextDate && (
                              <p className="mt-2 flex items-center gap-1 text-[11px] bg-white bg-opacity-50 p-1.5 rounded">
                                <Calendar className="w-3 h-3" />
                                Próxima ideal: {new Date(validation.recommendedNextDate).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {validation.rule && (
                  <div className="text-[10px] bg-white bg-opacity-50 p-1.5 rounded border border-red-200">
                    <p className="font-mono">
                      Plano: <strong>{validation.rule.plan_id}</strong>
                    </p>
                    <p className="font-mono">
                      Freq.: <strong>{validation.rule.frequency_days}d</strong> | 
                      Limite: <strong>{validation.rule.total_allowed}</strong> att.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!hasValidationIssues && (
            <Card className="border-l-4 border-l-green-500 bg-green-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-sm text-green-900">
                  <span className="text-lg">✅</span>
                  <span>Atendimento dentro das regras do plano</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados adicionais */}
          {attendanceItem.consultor_nome && (
            <Card>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Consultor: <strong>{attendanceItem.consultor_nome}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
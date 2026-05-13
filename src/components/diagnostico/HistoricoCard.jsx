import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAGNOSTIC_LABELS = {
  entrepreneur_diagnostic: 'Empreendedor',
  management_diagnostic: 'Gerencial',
  maturity_collaborative_diagnostic: 'Maturidade',
  productivity_diagnostic_tcmp2: 'Produtividade',
  performance_diagnostic_matrix30: 'Desempenho',
  workload_diagnostic: 'Carga de Trabalho',
  service_order_diagnostic_r70i30: 'Ordem de Serviço',
  disc_behavioral_diagnostic: 'DISC',
  debt_analysis_diagnostic: 'Endividamento',
  gerencial_diagnostic: 'Gerencial',
  commercial_diagnostic: 'Comercial'
};

const DIAGNOSTIC_COLORS = {
  entrepreneur_diagnostic: 'bg-blue-100 text-blue-800',
  management_diagnostic: 'bg-purple-100 text-purple-800',
  maturity_collaborative_diagnostic: 'bg-green-100 text-green-800',
  productivity_diagnostic_tcmp2: 'bg-orange-100 text-orange-800',
  performance_diagnostic_matrix30: 'bg-red-100 text-red-800',
  workload_diagnostic: 'bg-yellow-100 text-yellow-800',
  service_order_diagnostic_r70i30: 'bg-indigo-100 text-indigo-800',
  disc_behavioral_diagnostic: 'bg-pink-100 text-pink-800',
  debt_analysis_diagnostic: 'bg-cyan-100 text-cyan-800',
  gerencial_diagnostic: 'bg-teal-100 text-teal-800',
  commercial_diagnostic: 'bg-amber-100 text-amber-800'
};

export default function HistoricoCard({ diagnostic, onViewResult, onViewActionPlan }) {
  const isCompleted = !!diagnostic.completed_at;
  const diagnosticType = diagnostic.diagnostic_type || '';
  const label = DIAGNOSTIC_LABELS[diagnosticType] || 'Diagnóstico';
  const color = DIAGNOSTIC_COLORS[diagnosticType] || 'bg-gray-100 text-gray-800';

  const createdDate = diagnostic.created_date ? format(new Date(diagnostic.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A';
  const completedDate = diagnostic.completed_at ? format(new Date(diagnostic.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={color}>{label}</Badge>
              {isCompleted ? (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Realizado
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pendente
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">
              {diagnostic.client_name || 'Cliente sem nome'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {diagnostic.company_name && `${diagnostic.company_name}`}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Timeline de datas */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Iniciado:</span>
            <span className="font-medium text-gray-900">{createdDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Concluído:</span>
            <span className="font-medium text-gray-900">{completedDate}</span>
          </div>
        </div>

        {/* Realizado por */}
        {diagnostic.user_name && (
          <div className="text-sm">
            <span className="text-gray-600">Realizado por: </span>
            <span className="font-medium text-gray-900">{diagnostic.user_name}</span>
          </div>
        )}

        {/* Badges de IA */}
        <div className="flex gap-2 flex-wrap">
          {diagnostic.has_personalized_action_plan_ia && (
            <Badge variant="outline" className="bg-blue-50">
              ✨ Suporta IA
            </Badge>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onViewResult?.(diagnostic)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Ver Resultado
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          {isCompleted && diagnostic.has_personalized_action_plan_ia && (
            <Button
              onClick={() => onViewActionPlan?.(diagnostic)}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              ▶ Plano IA
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
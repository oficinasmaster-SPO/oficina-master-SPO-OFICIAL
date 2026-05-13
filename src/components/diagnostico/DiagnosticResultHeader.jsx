import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Building2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DiagnosticResultHeader({
  clientName,
  companyName,
  userName,
  completedAt,
  nextAllowedIn,
  isFrequencyBlocked = false
}) {
  const completionDate = completedAt ? new Date(completedAt) : null;

  return (
    <Card className="mb-8 border-l-4 border-l-blue-600 shadow-md">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Esquerda: Informações da Oficina */}
          <div className="space-y-4">
            {clientName && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Cliente</p>
                  <p className="text-lg font-bold text-gray-900">{clientName}</p>
                </div>
              </div>
            )}
            {companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Empresa</p>
                  <p className="text-lg font-bold text-gray-900">{companyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Direita: Quem e Quando */}
          <div className="space-y-4">
            {userName && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Respondente</p>
                  <p className="text-lg font-bold text-gray-900">{userName}</p>
                </div>
              </div>
            )}
            {completionDate && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Conclusão</p>
                  <p className="text-lg font-bold text-gray-900">
                    {format(completionDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Frequência */}
        {isFrequencyBlocked && nextAllowedIn && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-1">Próximo diagnóstico disponível em</p>
                <p className="text-amber-800">{nextAllowedIn}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
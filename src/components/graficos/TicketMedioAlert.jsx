import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Users } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";

export default function TicketMedioAlert({ 
  faturamentoRealizado, 
  clientesRealizados, 
  faturamentoMeta, 
  clientesMeta,
  ticketMedioIdeal 
}) {
  const ticketMedioRealizado = clientesRealizados > 0 
    ? faturamentoRealizado / clientesRealizados 
    : 0;

  const ticketMedioMetaProjetado = clientesMeta > 0
    ? faturamentoMeta / clientesMeta
    : ticketMedioIdeal;

  const percentualDiferenca = ticketMedioMetaProjetado > 0
    ? ((ticketMedioRealizado - ticketMedioMetaProjetado) / ticketMedioMetaProjetado) * 100
    : 0;

  // Se ticket médio está baixo, calcular quantos clientes extras precisam
  const clientesNecessarios = ticketMedioRealizado > 0
    ? Math.ceil(faturamentoMeta / ticketMedioRealizado)
    : 0;

  const clientesExtras = clientesNecessarios - clientesMeta;

  const isTicketBaixo = percentualDiferenca < -10;

  if (!isTicketBaixo) {
    return (
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-sm text-green-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ticket Médio Saudável
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(ticketMedioRealizado)}
          </div>
          <p className="text-xs text-green-300/70">
            Ticket médio {percentualDiferenca > 0 ? 'acima' : 'próximo'} do esperado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Atenção: Ticket Médio Baixo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Ticket Médio Atual</span>
            <span className="text-lg font-bold text-yellow-400">
              {formatCurrency(ticketMedioRealizado)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Ticket Médio Esperado</span>
            <span className="text-sm font-medium text-gray-300">
              {formatCurrency(ticketMedioMetaProjetado)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <TrendingDown className="w-3 h-3 text-orange-400" />
            <span className="text-orange-400 font-medium">
              {Math.abs(percentualDiferenca).toFixed(1)}% abaixo do esperado
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-yellow-500/20">
          <div className="bg-orange-500/10 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-orange-300">
              💡 Compensação Necessária
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
              Com o ticket médio atual de <span className="font-bold text-yellow-400">{formatCurrency(ticketMedioRealizado)}</span>, 
              você precisará de <span className="font-bold text-orange-400">{clientesNecessarios} clientes</span> para 
              atingir a meta de faturamento.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 font-bold">
                +{clientesExtras} clientes extras necessários
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-yellow-400">Ações Recomendadas:</span>
            <br />
            • Aumentar ticket médio através de upsell/cross-sell
            <br />
            • Focar em clientes de maior valor
            <br />
            • Ou aumentar volume de clientes para compensar
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
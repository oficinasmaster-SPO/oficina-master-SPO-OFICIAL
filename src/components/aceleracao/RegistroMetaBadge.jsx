import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, User } from "lucide-react";

export default function RegistroMetaBadge({ registroMeta, showDetail = false }) {
  if (!registroMeta) return null;

  const criadoEm = registroMeta.criado_em ? new Date(registroMeta.criado_em) : null;
  const dataFormatada = criadoEm ? format(criadoEm, "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-";

  if (!showDetail) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {registroMeta.criado_por_terceiro && (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Criado por terceiro
          </Badge>
        )}
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <User className="w-3 h-3" />
          {registroMeta.criado_por_nome || "N/A"}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3" />
          {dataFormatada}
        </Badge>
      </div>
    );
  }

  // Versão detalhada
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
      <div className="text-sm font-semibold text-blue-900 flex items-center gap-2">
        <User className="w-4 h-4" />
        Informações de Criação
      </div>

      <div className="space-y-1 text-xs text-gray-700 pl-6">
        <p>
          <span className="font-medium">Criado por:</span> {registroMeta.criado_por_nome} (
          {registroMeta.criado_por_cargo})
        </p>
        <p>
          <span className="font-medium">Para:</span> {registroMeta.criado_para_nome}
        </p>
        <p>
          <span className="font-medium">Data:</span> {dataFormatada}
        </p>
        {registroMeta.origem_tela && (
          <p>
            <span className="font-medium">Origem:</span> {registroMeta.origem_tela}
          </p>
        )}
        {registroMeta.criado_por_terceiro && (
          <p className="text-amber-700 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Este registro foi criado por um terceiro
          </p>
        )}
      </div>
    </div>
  );
}
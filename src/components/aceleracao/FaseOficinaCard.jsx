import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Activity } from "lucide-react";

const faseLabels = {
  1: { nome: "Fase 1 - Sobrevivência", cor: "bg-red-100 text-red-700 border-red-300" },
  2: { nome: "Fase 2 - Estruturação", cor: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  3: { nome: "Fase 3 - Crescimento", cor: "bg-blue-100 text-blue-700 border-blue-300" },
  4: { nome: "Fase 4 - Expansão", cor: "bg-green-100 text-green-700 border-green-300" }
};

export default function FaseOficinaCard({ workshop, diagnostic }) {
  const fase = diagnostic?.phase || workshop?.maturity_level || 1;
  const faseInfo = faseLabels[fase] || faseLabels[1];
  const dataAnalise = diagnostic?.created_date 
    ? new Date(diagnostic.created_date).toLocaleDateString('pt-BR')
    : 'Não realizada';

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          Fase da Oficina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Fase Atual</span>
          <Badge className={`${faseInfo.cor} border text-base px-4 py-1`}>
            Fase {fase}
          </Badge>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <p className="font-semibold text-purple-900 mb-1">{faseInfo.nome}</p>
          <p className="text-sm text-gray-600">Última análise: {dataAnalise}</p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            Complete as atividades do cronograma de implementação para evoluir para a próxima fase
          </p>
        </div>

        {diagnostic?.dominant_letter && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Perfil Dominante:</span> {diagnostic.dominant_letter}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
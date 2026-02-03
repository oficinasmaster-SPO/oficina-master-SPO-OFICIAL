import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Resumo de Avaliações 360º para exibir no perfil do colaborador
 */
export default function Avaliacao360Summary({ employeeId, avaliacoes = [] }) {
  const navigate = useNavigate();

  if (!avaliacoes || avaliacoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Avaliações 360°
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm mb-4">Nenhuma avaliação recebida ainda</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(createPageUrl('Avaliacao360'))}
          >
            Participar da Avaliação
          </Button>
        </CardContent>
      </Card>
    );
  }

  const avgScores = avaliacoes.reduce((acc, av) => {
    Object.entries(av.scores || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});

  Object.keys(avgScores).forEach(key => {
    avgScores[key] = avgScores[key] / avaliacoes.length;
  });

  const overallAvg = Object.values(avgScores).reduce((a, b) => a + b, 0) / Object.keys(avgScores).length;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Avaliações 360°
          </div>
          <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
            {overallAvg.toFixed(1)}/10
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(avgScores).slice(0, 4).map(([key, value]) => (
            <div key={key} className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</p>
              <p className="text-xl font-bold text-blue-600">{value.toFixed(1)}</p>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-sm text-gray-700">
            {avaliacoes.length} avaliações recebidas
          </p>
          <Button
            size="sm"
            onClick={() => navigate(createPageUrl('Avaliacao360'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
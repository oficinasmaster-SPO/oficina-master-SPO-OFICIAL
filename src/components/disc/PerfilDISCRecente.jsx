import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
import { profileInfo } from "@/components/disc/DISCQuestions";

const DIMENSIONS = ["executor_d", "comunicador_i", "planejador_s", "analista_c"];

// Sprint 4: exibe o resultado DISC mais recente do colaborador na tela de autoavaliação
export default function PerfilDISCRecente({ diagnostic, onViewResult, onRefazer }) {
  const scores = diagnostic?.profile_scores || {};
  const dominantInfo = profileInfo[diagnostic?.dominant_profile];

  if (!dominantInfo) return null;

  return (
    <Card className="border-2 border-purple-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: dominantInfo.color }}
          />
          Seu perfil DISC: {dominantInfo.title}
        </CardTitle>
        <p className="text-sm text-gray-500">
          Última autoavaliação concluída em{" "}
          {new Date(diagnostic.created_date).toLocaleDateString("pt-BR")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{dominantInfo.description}</p>

        <div className="space-y-3">
          {DIMENSIONS.map((key) => {
            const value = Number(scores[key] || 0);
            return (
              <div key={key}>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>{profileInfo[key].title}</span>
                  <span>{value.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(value, 100)}%`, backgroundColor: profileInfo[key].color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => onViewResult(diagnostic.id)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver resultado completo
          </Button>
          <Button variant="outline" onClick={onRefazer} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refazer avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
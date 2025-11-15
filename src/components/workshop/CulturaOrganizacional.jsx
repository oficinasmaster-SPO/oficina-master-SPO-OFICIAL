import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Target, Eye, Award } from "lucide-react";

export default function CulturaOrganizacional({ workshop }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <CardTitle>Missão, Visão e Valores</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workshop.mission ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Missão</h3>
              </div>
              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{workshop.mission}</p>
            </div>
          ) : null}

          {workshop.vision ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Visão</h3>
              </div>
              <p className="text-gray-700 bg-purple-50 p-3 rounded-lg">{workshop.vision}</p>
            </div>
          ) : null}

          {workshop.values && workshop.values.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Valores</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {workshop.values.map((value, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <Button
            onClick={() => navigate(createPageUrl("MissaoVisaoValores"))}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {workshop.mission ? "Editar com IA" : "Criar com IA"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nível de Maturidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
            <div>
              <p className="text-sm opacity-90">Nível Atual</p>
              <p className="text-3xl font-bold">Fase {workshop.maturity_level || 1}</p>
            </div>
            <Button variant="secondary" onClick={() => navigate(createPageUrl("Questionario"))}>
              Avaliar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
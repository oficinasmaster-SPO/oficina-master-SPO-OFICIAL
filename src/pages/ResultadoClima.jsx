import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ResultadoClima() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [climateData, setClimateData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);

      const climates = await base44.entities.CompanyClimate.list();
      const latestClimate = climates.find(c => c.workshop_id === userWorkshop?.id);
      
      setClimateData(latestClimate);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return "Excelente";
    if (score >= 6) return "Bom";
    if (score >= 4) return "Regular";
    return "Crítico";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!climateData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhuma pesquisa de clima encontrada</p>
            <Button onClick={() => navigate(createPageUrl("PesquisaClima"))}>
              Criar Nova Pesquisa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dimensions = [
    { key: "leadership", label: "Liderança" },
    { key: "communication", label: "Comunicação" },
    { key: "recognition", label: "Reconhecimento" },
    { key: "development", label: "Desenvolvimento" },
    { key: "work_environment", label: "Ambiente de Trabalho" },
    { key: "compensation", label: "Remuneração" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Resultado da Pesquisa de Clima
          </h1>
        </div>

        <Card className="mb-6 border-2 border-green-300">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl text-gray-600 mb-2">Nota Geral do Clima Organizacional</h2>
            <div className={`text-6xl font-bold ${getScoreColor(climateData.overall_score)}`}>
              {climateData.overall_score.toFixed(1)}
            </div>
            <p className="text-lg text-gray-600 mt-2">{getScoreLabel(climateData.overall_score)}</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {dimensions.map((dimension) => {
            const data = climateData.dimensions[dimension.key];
            return (
              <Card key={dimension.key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{dimension.label}</span>
                    <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
                      {data.score.toFixed(1)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={data.score * 10} className="mb-3" />
                  {data.feedback && (
                    <p className="text-sm text-gray-600 italic">{data.feedback}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={() => navigate(createPageUrl("PesquisaClima"))}>
            Nova Pesquisa
          </Button>
        </div>
      </div>
    </div>
  );
}
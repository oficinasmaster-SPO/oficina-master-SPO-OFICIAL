import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, TrendingUp, Save, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function PesquisaClima() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);

  const [ratings, setRatings] = useState({
    leadership: { score: 0, feedback: "" },
    communication: { score: 0, feedback: "" },
    recognition: { score: 0, feedback: "" },
    development: { score: 0, feedback: "" },
    work_environment: { score: 0, feedback: "" },
    compensation: { score: 0, feedback: "" }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (dimension, field, value) => {
    setRatings({
      ...ratings,
      [dimension]: { ...ratings[dimension], [field]: value }
    });
  };

  const calculateOverallScore = () => {
    const scores = Object.values(ratings).map(r => r.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  };

  const handleSubmit = async () => {
    const overallScore = calculateOverallScore();
    
    if (overallScore === 0) {
      toast.error("Por favor, avalie todas as dimensões");
      return;
    }

    setSaving(true);
    try {
      await base44.entities.CompanyClimate.create({
        workshop_id: workshop.id,
        reference_date: new Date().toISOString().split('T')[0],
        overall_score: overallScore,
        dimensions: ratings,
        employee_responses: [],
        participation_rate: 0,
        status: "aberta"
      });

      toast.success("Pesquisa de clima criada com sucesso!");
      navigate(createPageUrl("ResultadoClima"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar pesquisa");
    } finally {
      setSaving(false);
    }
  };

  const dimensions = [
    { key: "leadership", label: "Liderança", description: "Qualidade da gestão e liderança" },
    { key: "communication", label: "Comunicação", description: "Clareza e efetividade na comunicação" },
    { key: "recognition", label: "Reconhecimento", description: "Valorização do trabalho e esforço" },
    { key: "development", label: "Desenvolvimento", description: "Oportunidades de crescimento" },
    { key: "work_environment", label: "Ambiente de Trabalho", description: "Condições físicas e psicológicas" },
    { key: "compensation", label: "Remuneração", description: "Salários e benefícios" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Pesquisa de Clima Organizacional
          </h1>
          <p className="text-gray-600">Avalie o desempenho da empresa em cada dimensão (0 a 10)</p>
        </div>

        <div className="space-y-6">
          {dimensions.map((dimension) => (
            <Card key={dimension.key}>
              <CardHeader>
                <CardTitle>{dimension.label}</CardTitle>
                <p className="text-sm text-gray-600">{dimension.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nota (0 a 10)</Label>
                  <div className="flex gap-2 mt-2">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => updateRating(dimension.key, "score", score)}
                        className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                          ratings[dimension.key].score === score
                            ? "bg-green-600 text-white scale-110"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label>Feedback / Observações</Label>
                  <Textarea
                    value={ratings[dimension.key].feedback}
                    onChange={(e) => updateRating(dimension.key, "feedback", e.target.value)}
                    placeholder="Comentários sobre esta dimensão..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-2 border-green-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Nota Geral do Clima</h3>
                <p className="text-sm text-gray-600">Média das dimensões avaliadas</p>
              </div>
              <div className="text-4xl font-bold text-green-600">
                {calculateOverallScore().toFixed(1)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 px-8">
            {saving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Criar Pesquisa</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
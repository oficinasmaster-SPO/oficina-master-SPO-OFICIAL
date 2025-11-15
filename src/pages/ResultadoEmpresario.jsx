import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight, Home } from "lucide-react";
import { profilesInfo } from "../components/entrepreneur/EntrepreneurQuestions";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function ResultadoEmpresario() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [workshop, setWorkshop] = useState(null);

  useEffect(() => {
    loadDiagnostic();
  }, []);

  const loadDiagnostic = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.EntrepreneurDiagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      if (diag.workshop_id) {
        const workshops = await base44.entities.Workshop.list();
        const ws = workshops.find(w => w.id === diag.workshop_id);
        setWorkshop(ws);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) return null;

  const profileInfo = profilesInfo[diagnostic.dominant_profile];
  const chartData = [
    { name: "Aventureiro", value: diagnostic.profile_scores.aventureiro, color: "#ef4444" },
    { name: "Empreendedor", value: diagnostic.profile_scores.empreendedor, color: "#f59e0b" },
    { name: "Gestor", value: diagnostic.profile_scores.gestor, color: "#10b981" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Diagnóstico Concluído!
          </h1>
          {workshop && (
            <p className="text-gray-600">
              {workshop.name}
            </p>
          )}
        </div>

        {/* Perfil Dominante */}
        <Card className={`shadow-xl border-2 mb-8 bg-gradient-to-br ${profileInfo.color}`}>
          <CardHeader className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{profileInfo.title}</CardTitle>
                <Badge className="bg-white/20 text-white border-white/30">
                  Duração Típica: {profileInfo.duration}
                </Badge>
              </div>
              <div className="text-6xl font-bold opacity-20">
                {diagnostic.dominant_profile.charAt(0).toUpperCase()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white rounded-b-xl p-6">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              {profileInfo.description}
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Distribuição */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição de Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Características */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Características do seu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {profileInfo.characteristics.map((char, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{char}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Passos */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl">Próximos Passos Recomendados</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {profileInfo.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 flex-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-8"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DiagnosticoEmpresario"))}
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            Fazer Novo Diagnóstico
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
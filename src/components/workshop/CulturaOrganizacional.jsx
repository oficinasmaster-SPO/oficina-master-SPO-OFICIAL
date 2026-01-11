import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Eye, Award, Users, TrendingUp, BookOpen, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CulturaOrganizacional({ workshop }) {
  const navigate = useNavigate();
  const [exportingPDF, setExportingPDF] = useState(false);

  const { data: rituals = [], isLoading: loadingRituals } = useQuery({
    queryKey: ['rituals', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const data = await base44.entities.Ritual.filter({ workshop_id: workshop.id });
      return data || [];
    },
    enabled: !!workshop?.id
  });

  const pillarLabels = {
    proposito: "Propósito",
    missao: "Missão",
    visao: "Visão",
    valores: "Valores",
    postura_atitudes: "Postura e Atitudes",
    comportamentos_inaceitaveis: "Comportamentos Inaceitáveis",
    rituais_cultura: "Rituais de Cultura",
    sistemas_regras: "Sistemas e Regras",
    comunicacao_interna: "Comunicação Interna",
    lideranca: "Liderança",
    foco_cliente: "Foco no Cliente",
    performance_responsabilidade: "Performance e Responsabilidade",
    desenvolvimento_continuo: "Desenvolvimento Contínuo",
    identidade_pertencimento: "Identidade e Pertencimento"
  };

  const frequencyLabels = {
    diario: "Diário",
    semanal: "Semanal",
    quinzenal: "Quinzenal",
    mensal: "Mensal",
    continuo: "Contínuo",
    trimestral: "Trimestral",
    eventual: "Eventual"
  };

  const handleExportPDF = async () => {
    if (!workshop?.id) {
      toast.error("Oficina não encontrada");
      return;
    }

    setExportingPDF(true);
    try {
      const response = await base44.functions.invoke('exportCultureManual', {
        workshop_id: workshop.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Manual_Cultura_${workshop.name || 'Oficina'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportingPDF(false);
    }
  };

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  // Get workshop_id and assistance_mode from URL to pass along navigation
  const getColaboradoresUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const workshopId = urlParams.get('workshop_id');
    const assistanceMode = urlParams.get('assistance_mode');
    
    let url = createPageUrl("Colaboradores");
    if (workshopId) {
      url += `?workshop_id=${workshopId}`;
      if (assistanceMode) {
        url += `&assistance_mode=${assistanceMode}`;
      }
    }
    return url;
  };

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

          <div className="flex gap-2">
            <Button
              onClick={() => navigate(createPageUrl("MissaoVisaoValores"))}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {workshop.mission ? "Editar com IA" : "Criar com IA"}
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={exportingPDF || !workshop.mission}
              variant="outline"
              className="flex-shrink-0"
            >
              {exportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </>
              )}
            </Button>
          </div>
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

      <Card className="shadow-lg border-2 border-yellow-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-yellow-600" />
              <div>
                <CardTitle>🔥 Rituais de Aculturamento</CardTitle>
                <CardDescription>
                  {loadingRituals ? "Carregando..." : `${rituals.length} rituais cadastrados`}
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("Rituais"))}
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Ver Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRituals ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
            </div>
          ) : rituals.length === 0 ? (
            <>
              <p className="text-sm text-gray-600">
                Rituais são práticas consistentes que fortalecem a cultura organizacional e conectam a equipe aos valores da empresa.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("Rituais"))}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Importar 34 Rituais
              </Button>
            </>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {rituals.slice(0, 10).map((ritual) => (
                  <div key={ritual.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{ritual.name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {pillarLabels[ritual.pillar]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {frequencyLabels[ritual.frequency]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {ritual.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{ritual.description}</p>
                    )}
                  </div>
                ))}
              </div>
              {rituals.length > 10 && (
                <p className="text-xs text-gray-500 text-center">
                  + {rituals.length - 10} rituais adicionais
                </p>
              )}
              <Button
                onClick={() => navigate(createPageUrl("Rituais"))}
                variant="outline"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerenciar Todos os Rituais
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-green-600" />
            <div>
              <CardTitle>Relação com Colaboradores</CardTitle>
              <CardDescription>Gestão de pessoas e equipe</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate(createPageUrl("Colaboradores"))}
            variant="outline"
            className="w-full justify-start"
          >
            <Users className="w-4 h-4 mr-2" />
            Gerenciar Colaboradores
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("CDCList"))}
            variant="outline"
            className="w-full justify-start"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            CDC - Conexão e Diagnóstico
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("COEXList"))}
            variant="outline"
            className="w-full justify-start"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            COEX - Contratos de Expectativas
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Engajamento com Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Score de Engajamento</span>
              <span className="text-2xl font-bold text-blue-600">{workshop.engagement_score || 0}%</span>
            </div>
            {workshop.certificados && workshop.certificados.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Certificados Conquistados</p>
                <div className="space-y-2">
                  {workshop.certificados.map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span>{cert.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
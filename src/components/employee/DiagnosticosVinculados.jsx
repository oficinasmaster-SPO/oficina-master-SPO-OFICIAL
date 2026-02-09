import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Brain, TrendingUp, Target, CheckCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DiagnosticosVinculados({ employee }) {
  const navigate = useNavigate();

  const { data: maturityDiags = [], isLoading: loadingMaturity } = useQuery({
    queryKey: ['maturity-diags', employee.id],
    queryFn: async () => {
      const diags = await base44.entities.CollaboratorMaturityDiagnostic.list();
      return diags.filter(d => d.employee_id === employee.id);
    }
  });

  const { data: productivityDiags = [], isLoading: loadingProductivity } = useQuery({
    queryKey: ['productivity-diags', employee.id],
    queryFn: async () => {
      const diags = await base44.entities.ProductivityDiagnostic.list();
      return diags.filter(d => d.employee_id === employee.id);
    }
  });

  const { data: performanceDiags = [], isLoading: loadingPerformance } = useQuery({
    queryKey: ['performance-diags', employee.id],
    queryFn: async () => {
      const diags = await base44.entities.PerformanceMatrixDiagnostic.list();
      return diags.filter(d => d.employee_id === employee.id);
    }
  });

  const { data: discDiags = [], isLoading: loadingDISC } = useQuery({
    queryKey: ['disc-diags', employee.id],
    queryFn: async () => {
      const diags = await base44.entities.DISCDiagnostic.list();
      return diags.filter(d => d.employee_id === employee.id);
    }
  });

  if (loadingMaturity || loadingProductivity || loadingPerformance || loadingDISC) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const diagnosticCards = [
    {
      title: "Diagnóstico de Maturidade",
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500",
      data: maturityDiags,
      createLink: `DiagnosticoMaturidade?employee_id=${employee.id}`,
      viewLink: (id) => `ResultadoMaturidade?id=${id}`
    },
    {
      title: "Diagnóstico de Produtividade",
      icon: Target,
      color: "from-green-500 to-emerald-500",
      data: productivityDiags,
      createLink: `DiagnosticoProducao?employee_id=${employee.id}`,
      viewLink: (id) => `ResultadoProducao?id=${id}`
    },
    {
      title: "Matriz de Desempenho",
      icon: Award,
      color: "from-purple-500 to-pink-500",
      data: performanceDiags,
      createLink: `DiagnosticoDesempenho?employee_id=${employee.id}`,
      viewLink: (id) => `ResultadoDesempenho?id=${id}`
    },
    {
      title: "Perfil DISC",
      icon: Brain,
      color: "from-orange-500 to-red-500",
      data: discDiags,
      createLink: `DiagnosticoDISC?employee_id=${employee.id}`,
      viewLink: (id) => `ResultadoDISC?id=${id}`
    }
  ];

  return (
    <div className="space-y-6">
      {diagnosticCards.map((diagnostic, index) => {
        const Icon = diagnostic.icon;
        const latestDiag = diagnostic.data.length > 0 ? diagnostic.data[diagnostic.data.length - 1] : null;

        return (
          <Card key={index} className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${diagnostic.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle>{diagnostic.title}</CardTitle>
                </div>
                <Button onClick={() => navigate(createPageUrl(diagnostic.createLink))}>
                  Realizar Novo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {diagnostic.data.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nenhum diagnóstico realizado</p>
                  <Button onClick={() => navigate(createPageUrl(diagnostic.createLink))} variant="outline">
                    Realizar Primeiro Diagnóstico
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">{diagnostic.data.length} diagnóstico(s) realizado(s)</span>
                  </div>

                  {latestDiag && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Último Diagnóstico</span>
                        <Badge className="bg-blue-600">
                          {new Date(latestDiag.created_date).toLocaleDateString('pt-BR')}
                        </Badge>
                      </div>
                      
                      {latestDiag.maturity_level && (
                        <p className="text-sm text-gray-700 mb-2">
                          Nível de Maturidade: <strong className="capitalize">{latestDiag.maturity_level}</strong>
                        </p>
                      )}
                      
                      {latestDiag.classification && (
                        <p className="text-sm text-gray-700 mb-2">
                          Classificação: <strong className="capitalize">{latestDiag.classification}</strong>
                        </p>
                      )}

                      {latestDiag.dominant_profile && (
                        <p className="text-sm text-gray-700 mb-2">
                          Perfil Dominante: <strong>{latestDiag.dominant_profile}</strong>
                        </p>
                      )}

                      <Button 
                        size="sm" 
                        className="mt-3" 
                        onClick={() => navigate(createPageUrl(diagnostic.viewLink(latestDiag.id)))}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Resultado Completo
                      </Button>
                    </div>
                  )}

                  {diagnostic.data.length > 1 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                        Ver todos os {diagnostic.data.length} diagnósticos
                      </summary>
                      <div className="mt-3 space-y-2">
                        {diagnostic.data.slice(0, -1).reverse().map((diag, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                            <span className="text-sm">
                              {new Date(diag.created_date).toLocaleDateString('pt-BR')}
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(createPageUrl(diagnostic.viewLink(diag.id)))}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
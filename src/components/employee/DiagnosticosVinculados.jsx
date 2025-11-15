import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Smile, Users, Link as LinkIcon, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DiagnosticosVinculados({ employee }) {
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState({
    disc: null,
    performance: [],
    maturity: []
  });

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      // DISC
      if (employee.behavioral_profile_id) {
        const discList = await base44.entities.DISCDiagnostic.list();
        const disc = discList.find(d => d.id === employee.behavioral_profile_id);
        if (disc) {
          setDiagnostics(prev => ({ ...prev, disc }));
        }
      }

      // Performance
      if (employee.performance_diagnostics?.length > 0) {
        const perfList = await base44.entities.PerformanceMatrixDiagnostic.list();
        const performance = perfList.filter(p => employee.performance_diagnostics.includes(p.id));
        setDiagnostics(prev => ({ ...prev, performance }));
      }

      // Maturity
      if (employee.maturity_diagnostics?.length > 0) {
        const matList = await base44.entities.CollaboratorMaturityDiagnostic.list();
        const maturity = matList.filter(m => employee.maturity_diagnostics.includes(m.id));
        setDiagnostics(prev => ({ ...prev, maturity }));
      }
    } catch (error) {
      console.error("Erro ao carregar diagnósticos:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-purple-600" />
            Perfil Comportamental DISC
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.disc ? (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="font-semibold text-purple-900 mb-2">
                Perfil: {diagnostics.disc.dominant_profile?.toUpperCase()}
              </p>
              <p className="text-sm text-purple-800 mb-3">
                Realizado em: {new Date(diagnostics.disc.created_date).toLocaleDateString('pt-BR')}
              </p>
              <Button
                size="sm"
                onClick={() => navigate(createPageUrl("ResultadoDISC") + `?id=${diagnostics.disc.id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Resultado Completo
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">Nenhum teste DISC vinculado</p>
              <Button onClick={() => navigate(createPageUrl("DiagnosticoDISC"))}>
                Realizar Teste DISC
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Matriz de Desempenho
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.performance.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.performance.map((perf) => (
                <div key={perf.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">
                        Classificação: {perf.classification}
                      </p>
                      <p className="text-sm text-blue-800">
                        {new Date(perf.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("ResultadoDesempenho") + `?id=${perf.id}`)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">Nenhuma avaliação de desempenho</p>
              <Button onClick={() => navigate(createPageUrl("DiagnosticoDesempenho"))}>
                Realizar Avaliação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Diagnósticos de Maturidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {diagnostics.maturity.length > 0 ? (
            <div className="space-y-3">
              {diagnostics.maturity.map((mat) => (
                <div key={mat.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">
                        Nível: {mat.maturity_level}
                      </p>
                      <p className="text-sm text-green-800">
                        {new Date(mat.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(createPageUrl("ResultadoMaturidade") + `?id=${mat.id}`)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-3">Nenhum diagnóstico de maturidade</p>
              <Button onClick={() => navigate(createPageUrl("DiagnosticoMaturidade"))}>
                Realizar Diagnóstico
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
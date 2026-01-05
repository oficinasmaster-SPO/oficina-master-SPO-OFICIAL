import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Equal, User, Users } from "lucide-react";

export default function EvaluationComparison({ selfEvaluation, managerEvaluation, type = "maturity" }) {
  if (!selfEvaluation || !managerEvaluation) return null;

  const renderMaturityComparison = () => {
    const levels = ['bebe', 'crianca', 'adolescente', 'adulto'];
    const levelLabels = {
      bebe: 'Bebê',
      crianca: 'Criança',
      adolescente: 'Adolescente',
      adulto: 'Adulto'
    };

    const selfLevel = levels.indexOf(selfEvaluation.maturity_level);
    const managerLevel = levels.indexOf(managerEvaluation.maturity_level);
    const gap = selfLevel - managerLevel;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Autoavaliação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {levelLabels[selfEvaluation.maturity_level]}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {Object.entries(selfEvaluation.maturity_scores || {}).map(([key, value]) => (
                  <span key={key} className="mr-2">{levelLabels[key]}: {value}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Avaliação do Gestor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                {levelLabels[managerEvaluation.maturity_level]}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {Object.entries(managerEvaluation.maturity_scores || {}).map(([key, value]) => (
                  <span key={key} className="mr-2">{levelLabels[key]}: {value}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Análise da Diferença */}
        <Card className={`border-2 ${gap > 0 ? 'border-orange-200 bg-orange-50' : gap < 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {gap > 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-900">Autoavaliação Superestimada</p>
                    <p className="text-sm text-orange-700">
                      O colaborador se vê {Math.abs(gap)} nível{Math.abs(gap) > 1 ? 's' : ''} acima da percepção do gestor. 
                      Recomenda-se alinhar expectativas através de feedback objetivo.
                    </p>
                  </div>
                </>
              ) : gap < 0 ? (
                <>
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Autoavaliação Conservadora</p>
                    <p className="text-sm text-green-700">
                      O colaborador se vê {Math.abs(gap)} nível{Math.abs(gap) > 1 ? 's' : ''} abaixo da percepção do gestor. 
                      Isso pode indicar baixa autoconfiança ou síndrome do impostor.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Equal className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Percepções Alinhadas</p>
                    <p className="text-sm text-blue-700">
                      Autoavaliação e avaliação do gestor estão alinhadas. Excelente autoconsciência!
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformanceComparison = () => {
    const selfTech = selfEvaluation.technical_average || 0;
    const selfEmot = selfEvaluation.emotional_average || 0;
    const managerTech = managerEvaluation.technical_average || 0;
    const managerEmot = managerEvaluation.emotional_average || 0;

    const techGap = selfTech - managerTech;
    const emotGap = selfEmot - managerEmot;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Autoavaliação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Técnica</p>
                <p className="text-xl font-bold text-blue-700">{selfTech.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Emocional</p>
                <p className="text-xl font-bold text-blue-700">{selfEmot.toFixed(1)}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-700">{selfEvaluation.classification}</Badge>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Avaliação do Gestor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Técnica</p>
                <p className="text-xl font-bold text-purple-700">{managerTech.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Emocional</p>
                <p className="text-xl font-bold text-purple-700">{emotGap.toFixed(1)}</p>
              </div>
              <Badge className="bg-purple-100 text-purple-700">{managerEvaluation.classification}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Gaps por Área */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`border ${Math.abs(techGap) > 2 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Gap Técnico</p>
              <div className="flex items-center gap-2">
                {techGap > 0 ? (
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                ) : techGap < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : (
                  <Equal className="w-5 h-5 text-blue-600" />
                )}
                <span className={`text-lg font-bold ${techGap > 0 ? 'text-orange-600' : techGap < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                  {techGap > 0 ? '+' : ''}{techGap.toFixed(1)} pontos
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={`border ${Math.abs(emotGap) > 2 ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Gap Emocional</p>
              <div className="flex items-center gap-2">
                {emotGap > 0 ? (
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                ) : emotGap < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : (
                  <Equal className="w-5 h-5 text-blue-600" />
                )}
                <span className={`text-lg font-bold ${emotGap > 0 ? 'text-orange-600' : emotGap < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                  {emotGap > 0 ? '+' : ''}{emotGap.toFixed(1)} pontos
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recomendação */}
        <Card className="bg-purple-50 border-2 border-purple-200">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-purple-900 mb-2">💡 Insights da Comparação</p>
            <ul className="text-sm text-purple-800 space-y-1">
              {Math.abs(techGap) > 2 && (
                <li>
                  {techGap > 0 
                    ? '⚠️ Grande gap técnico: colaborador pode estar superestimando suas habilidades técnicas. Recomenda-se treinamento prático.' 
                    : '✅ Colaborador subestima competência técnica: valorize conquistas e dê feedback positivo.'}
                </li>
              )}
              {Math.abs(emotGap) > 2 && (
                <li>
                  {emotGap > 0 
                    ? '⚠️ Gap emocional significativo: necessário desenvolver soft skills através de coaching.' 
                    : '✅ Inteligência emocional subestimada: incentivar liderança de equipes.'}
                </li>
              )}
              {Math.abs(techGap) <= 1 && Math.abs(emotGap) <= 1 && (
                <li>✅ Percepções muito alinhadas - colaborador tem excelente autoconsciência.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (type === "maturity") return renderMaturityComparison();
  if (type === "performance") return renderPerformanceComparison();
  
  return null;
}
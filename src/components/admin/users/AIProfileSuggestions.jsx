import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, Info, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";

export default function AIProfileSuggestions({ 
  cargo, 
  area, 
  workshopId,
  onApplySuggestion 
}) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  const generateSuggestions = async () => {
    if (!cargo || !area) {
      toast.error("Preencha cargo e área antes de gerar sugestões");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('suggestEmployeeProfile', {
        cargo,
        area,
        workshop_id: workshopId
      });

      if (response.data.success) {
        setSuggestion(response.data.suggestion);
        toast.success("Sugestões geradas pela IA!");
      } else {
        toast.error("Erro ao gerar sugestões");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const applyAllSuggestions = () => {
    if (!suggestion) return;
    
    onApplySuggestion({
      job_role: suggestion.job_role,
      profile_id: suggestion.suggested_profile_id
    });

    toast.success("Sugestões aplicadas! Revise antes de salvar.");
  };

  if (!suggestion && !loading) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              Sugestões Inteligentes de Perfil
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              A IA analisará o cargo e área para sugerir automaticamente a função, 
              perfil de acesso e módulos mais adequados
            </p>
            <Button
              onClick={generateSuggestions}
              disabled={!cargo || !area}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Sugestões com IA
            </Button>
            {(!cargo || !area) && (
              <p className="text-xs text-orange-600 mt-2">
                Preencha cargo e área primeiro
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Analisando perfil e gerando sugestões...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Sparkles className="w-5 h-5" />
          Sugestões da IA
          <Badge className="ml-auto bg-purple-600 text-white">
            {suggestion.job_role_confidence}% confiança
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job Role Sugerido */}
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-gray-600 mb-1">Função Sugerida</p>
              <p className="font-semibold text-lg text-gray-900">
                {suggestion.job_role}
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-700 mt-2">
            <Info className="w-4 h-4 inline mr-1" />
            {suggestion.job_role_reasoning}
          </p>
        </div>

        {/* Perfil Sugerido */}
        {suggestion.suggested_profile_name && (
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Perfil de Acesso Recomendado</p>
            <p className="font-semibold text-gray-900">
              {suggestion.suggested_profile_name}
            </p>
          </div>
        )}

        {/* Módulos Recomendados */}
        {suggestion.recommended_modules?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <Target className="w-4 h-4" />
              Módulos Recomendados
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestion.recommended_modules.map((module, idx) => (
                <Badge 
                  key={idx}
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {module}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Dicas de Onboarding */}
        {suggestion.onboarding_tips?.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Dicas de Onboarding
            </p>
            <ul className="space-y-1">
              {suggestion.onboarding_tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={applyAllSuggestions}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aplicar Sugestões
          </Button>
          <Button
            onClick={() => setSuggestion(null)}
            variant="outline"
          >
            Nova Análise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
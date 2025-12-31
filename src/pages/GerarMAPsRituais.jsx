import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Flame, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GerarMAPsRituais() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [completed, setCompleted] = useState(false);

  const TOTAL_RITUAIS = 33;
  const BATCH_SIZE = 5;

  const generateAllMAPs = async () => {
    setGenerating(true);
    setProgress(0);
    setResults([]);
    setErrors([]);
    setCompleted(false);

    let currentIndex = 0;
    const allCreated = [];
    const allErrors = [];

    while (currentIndex < TOTAL_RITUAIS) {
      try {
        const response = await base44.functions.invoke('gerarMAPsRituais', {
          batch_size: BATCH_SIZE,
          start_index: currentIndex
        });

        if (response.data.details) {
          allCreated.push(...response.data.details);
        }
        if (response.data.errors) {
          allErrors.push(...response.data.errors);
        }

        currentIndex = response.data.next_index || currentIndex + BATCH_SIZE;
        const currentProgress = Math.min(100, Math.round((currentIndex / TOTAL_RITUAIS) * 100));
        setProgress(currentProgress);
        setResults(allCreated);
        setErrors(allErrors);

        if (!response.data.has_more) break;

      } catch (error) {
        console.error("Erro no lote:", error);
        toast.error(`Erro ao processar lote iniciando em ${currentIndex}`);
        allErrors.push({ ritual: `Lote ${currentIndex}`, error: error.message });
        break;
      }
    }

    setCompleted(true);
    setGenerating(false);
    
    if (allCreated.length > 0) {
      toast.success(`${allCreated.length} MAPs criados com sucesso!`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("MeusProcessos"))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Processos
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Gerar MAPs para Rituais</CardTitle>
                <p className="text-gray-600 text-sm mt-1">
                  Criação automática de {TOTAL_RITUAIS} MAPs completos com IA
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Sobre o Processo</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Serão criados {TOTAL_RITUAIS} MAPs completos na categoria "Ritual"</li>
                <li>• Cada MAP terá: Objetivo, Fluxo, Atividades, Riscos, Indicadores e Evidências</li>
                <li>• Processamento em lotes de {BATCH_SIZE} rituais por vez</li>
                <li>• Tempo estimado: 3-5 minutos</li>
              </ul>
            </div>

            {!generating && !completed && (
              <Button
                onClick={generateAllMAPs}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12"
                size="lg"
              >
                <Flame className="w-5 h-5 mr-2" />
                Iniciar Geração de {TOTAL_RITUAIS} MAPs
              </Button>
            )}

            {generating && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progresso</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Gerando MAPs... {results.length} de {TOTAL_RITUAIS} criados
                  </p>
                </div>
              </div>
            )}

            {completed && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h4 className="font-semibold text-green-900">Geração Concluída!</h4>
                  </div>
                  <p className="text-sm text-green-800">
                    {results.length} MAPs foram criados com sucesso.
                  </p>
                </div>

                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <h4 className="font-semibold text-red-900">
                        {errors.length} Erros Encontrados
                      </h4>
                    </div>
                    <div className="space-y-1 text-sm text-red-800">
                      {errors.map((err, i) => (
                        <p key={i}>• {err.ritual}: {err.error}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">{item.ritual}</p>
                          <p className="text-xs text-gray-500 font-mono">{item.code}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Criado</Badge>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(createPageUrl("MeusProcessos") + "?tab=Ritual")}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Ver MAPs Criados
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex-1"
                  >
                    Gerar Novamente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function RitualMAPGenerator({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [rituais, setRituais] = useState([]);
  const [selectedRituais, setSelectedRituais] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    loadRituaisSemMAP();
  }, []);

  const loadRituaisSemMAP = async () => {
    setLoading(true);
    try {
      // Lista de todos os rituais
      const allRituais = [
        { id: "ritual_alinhamento_cultural", name: "Ritual de Alinhamento Cultural" },
        { id: "ritual_dono", name: "Ritual do Dono (Pensar Como Dono)" },
        { id: "ritual_excelencia", name: "Ritual da Excelência" },
        { id: "ritual_clareza", name: "Ritual de Clareza" },
        { id: "ritual_conexao", name: "Ritual de Conexão" },
        { id: "ritual_mesa_redonda", name: "Ritual da Mesa Redonda" },
        { id: "ritual_start_diario", name: "Ritual do Start Diário" },
        { id: "ritual_entrega", name: "Ritual da Entrega" },
        { id: "ritual_responsabilidade", name: "Ritual da Responsabilidade" },
        { id: "ritual_maturidade", name: "Ritual da Maturidade Profissional" },
        { id: "ritual_alta_performance", name: "Ritual da Alta Performance" },
        { id: "ritual_foco_cliente", name: "Ritual do Foco no Cliente" },
        { id: "ritual_confianca", name: "Ritual da Confiança" },
        { id: "ritual_voz_ativa", name: "Ritual da Voz Ativa" },
        { id: "ritual_consistencia", name: "Ritual da Consistência" },
        { id: "ritual_cultura_viva", name: "Ritual da Cultura Viva" },
        { id: "ritual_transparencia", name: "Ritual da Transparência" },
        { id: "ritual_acao_imediata", name: "Ritual da Ação Imediata" },
        { id: "ritual_planejamento_vivo", name: "Ritual do Planejamento Vivo" },
        { id: "ritual_kick_off", name: "Ritual de Abertura de Semana (Kick Off)" },
        { id: "ritual_virada", name: "Ritual da Virada" },
        { id: "ritual_compromisso", name: "Ritual do Compromisso" },
        { id: "ritual_semana_dono", name: "Ritual da Semana do Dono" },
        { id: "ritual_checkpoint", name: "Ritual do Checkpoint" },
        { id: "ritual_feedback_continuo", name: "Ritual do Feedback Contínuo" },
        { id: "ritual_pulso_cultura", name: "Ritual do Pulso da Cultura" },
        { id: "ritual_norte_claro", name: "Ritual do Norte Claro" },
        { id: "ritual_postura", name: "Ritual da Postura" },
        { id: "ritual_presenca", name: "Ritual da Presença" },
        { id: "ritual_identidade", name: "Ritual da Identidade" },
        { id: "ritual_forca_operacional", name: "Ritual da Força Operacional" },
        { id: "ritual_flow_equipe", name: "Ritual do Flow da Equipe" },
        { id: "ritual_compromisso_ativo", name: "Ritual do Compromisso Ativo" },
        { id: "ritual_3_verdades", name: "Ritual das 3 Verdades" }
      ];

      // Buscar MAPs existentes
      const existingMAPs = await base44.entities.ProcessDocument.filter({ category: "Ritual" });
      const existingTitles = existingMAPs.map(m => m.title.toLowerCase());

      // Filtrar rituais que não têm MAP
      const rituaisSemMAP = allRituais.filter(r => 
        !existingTitles.includes(r.name.toLowerCase())
      );

      setRituais(rituaisSemMAP);
    } catch (error) {
      console.error("Erro ao carregar rituais:", error);
      toast.error("Erro ao carregar rituais");
    } finally {
      setLoading(false);
    }
  };

  const toggleRitual = (ritualId) => {
    setSelectedRituais(prev => 
      prev.includes(ritualId) 
        ? prev.filter(id => id !== ritualId)
        : [...prev, ritualId]
    );
  };

  const selectAll = () => {
    setSelectedRituais(rituais.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedRituais([]);
  };

  const generateSelected = async () => {
    if (selectedRituais.length === 0) {
      toast.error("Selecione pelo menos um ritual");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResults([]);
    setErrors([]);

    try {
      // Processar em lotes usando a função existente
      const BATCH_SIZE = 5;
      let currentIndex = 0;
      const allCreated = [];
      const allErrors = [];

      // Encontrar os índices dos rituais selecionados na lista completa
      const allRituaisIds = [
        "ritual_alinhamento_cultural", "ritual_dono", "ritual_excelencia",
        "ritual_clareza", "ritual_conexao", "ritual_mesa_redonda",
        "ritual_start_diario", "ritual_entrega", "ritual_responsabilidade",
        "ritual_maturidade", "ritual_alta_performance", "ritual_foco_cliente",
        "ritual_confianca", "ritual_voz_ativa", "ritual_consistencia",
        "ritual_cultura_viva", "ritual_transparencia", "ritual_acao_imediata",
        "ritual_planejamento_vivo", "ritual_kick_off", "ritual_virada",
        "ritual_compromisso", "ritual_semana_dono", "ritual_checkpoint",
        "ritual_feedback_continuo", "ritual_pulso_cultura", "ritual_norte_claro",
        "ritual_postura", "ritual_presenca", "ritual_identidade",
        "ritual_forca_operacional", "ritual_flow_equipe", "ritual_compromisso_ativo",
        "ritual_3_verdades"
      ];

      while (currentIndex < selectedRituais.length) {
        const batch = selectedRituais.slice(currentIndex, currentIndex + BATCH_SIZE);
        
        for (const ritualId of batch) {
          const ritual = rituais.find(r => r.id === ritualId);
          const globalIndex = allRituaisIds.indexOf(ritualId);
          
          try {
            const response = await base44.functions.invoke('gerarMAPsRituais', {
              batch_size: 1,
              start_index: globalIndex
            });

            if (response.data.details && response.data.details.length > 0) {
              allCreated.push({ ritual: ritual.name, success: true });
            } else {
              allErrors.push({ ritual: ritual.name, error: "Não foi possível criar o MAP" });
            }
          } catch (error) {
            console.error(`Erro ao gerar MAP para ${ritual.name}:`, error);
            allErrors.push({ ritual: ritual.name, error: error.message || "Erro desconhecido" });
          }
        }

        currentIndex += BATCH_SIZE;
        const progress = Math.round((currentIndex / selectedRituais.length) * 100);
        setProgress(Math.min(100, progress));
        setResults(allCreated);
        setErrors(allErrors);
      }

      if (allCreated.length > 0) {
        toast.success(`${allCreated.length} MAPs criados com sucesso!`);
      }
      if (allErrors.length > 0) {
        toast.error(`${allErrors.length} erros encontrados`);
      }
    } catch (error) {
      console.error("Erro geral na geração:", error);
      toast.error("Erro ao gerar MAPs");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (rituais.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Todos os rituais já possuem MAPs!
          </h3>
          <p className="text-gray-600">
            Não há rituais pendentes para geração de MAPs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle>Gerar MAPs para Rituais</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {rituais.length} rituais sem MAP encontrados
                </p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700">
              {selectedRituais.length} selecionados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={selectAll}
              disabled={generating}
            >
              Selecionar Todos
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={deselectAll}
              disabled={generating}
            >
              Limpar Seleção
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
            {rituais.map((ritual) => (
              <label
                key={ritual.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
              >
                <Checkbox
                  checked={selectedRituais.includes(ritual.id)}
                  onCheckedChange={() => toggleRitual(ritual.id)}
                  disabled={generating}
                />
                <span className="flex-1 text-sm">{ritual.name}</span>
              </label>
            ))}
          </div>

          {generating && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando MAPs... {progress}%
              </div>
            </div>
          )}

          {!generating && results.length === 0 && (
            <Button
              onClick={generateSelected}
              disabled={selectedRituais.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar {selectedRituais.length} MAP{selectedRituais.length !== 1 ? 's' : ''}
            </Button>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">
                    {results.length} MAPs criados com sucesso!
                  </span>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">
                      {errors.length} erro(s)
                    </span>
                  </div>
                  <div className="text-sm text-red-800 space-y-1">
                    {errors.map((err, i) => (
                      <p key={i}>• {err.ritual}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
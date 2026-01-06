import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Save, Plus, Mic } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import ScriptsList from "./ScriptsList";
import AudioRecorder from "./AudioRecorder";

export default function DreamScriptModal({ open, onClose, workshop, script, onSave, onSelectScript }) {
  const [viewMode, setViewMode] = useState("list"); // "list", "view", "edit", "create"
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedScript, setSelectedScript] = useState(script);
  const [showAudioRecorder, setShowAudioRecorder] = useState(null); // qual campo está gravando
  const [formData, setFormData] = useState({
    company_history: "",
    mission: workshop?.mission || "",
    vision: workshop?.vision || "",
    values: workshop?.values || [],
    growth_opportunities: "",
    not_fit_profile: "",
    success_stories: []
  });

  const { data: allScripts = [] } = useQuery({
    queryKey: ['culture-scripts', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const result = await base44.entities.CultureScript.filter({ 
        workshop_id: workshop.id 
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshop?.id && open
  });

  useEffect(() => {
    if (script) {
      setSelectedScript(script);
      setFormData({
        company_history: script.company_history || "",
        mission: script.mission || workshop?.mission || "",
        vision: script.vision || workshop?.vision || "",
        values: script.values || workshop?.values || [],
        growth_opportunities: script.growth_opportunities || "",
        not_fit_profile: script.not_fit_profile || "",
        success_stories: script.success_stories || []
      });
      setViewMode("view");
    } else if (allScripts.length === 0) {
      setViewMode("create");
    } else {
      setViewMode("list");
    }
  }, [script, workshop, allScripts.length]);

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      // Buscar metas mensais e anuais
      let metasInfo = "";
      if (workshop?.monthly_goals?.projected_revenue) {
        metasInfo += `Meta de Faturamento Mensal: R$ ${workshop.monthly_goals.projected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }
      if (workshop?.annual_goals?.projected_revenue) {
        metasInfo += `Meta de Faturamento Anual: R$ ${workshop.annual_goals.projected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      }

      const prompt = `
  Você é um especialista em RH e cultura organizacional. Crie um script persuasivo de "venda do sonho" para candidatos em processo seletivo.

  DADOS DA EMPRESA:
  Nome: ${workshop?.name || "Oficina"}
  Segmento: ${workshop?.segment || workshop?.segment_auto || "Automotivo"}
  Missão: ${formData.mission || "Não informada"}
  Visão: ${formData.vision || "Não informada"}
  Valores: ${formData.values?.length > 0 ? formData.values.join(", ") : "Não informados"}

  ${metasInfo ? `METAS FINANCEIRAS:\n${metasInfo}` : ""}

  ${formData.company_history ? `CONTEXTO ADICIONAL:\n${formData.company_history}\n` : ""}

  GERE UM SCRIPT COMPLETO E PERSUASIVO COM:
  1. História da Empresa (breve, inspiradora, conectada à missão/visão)
  2. Oportunidades de Crescimento (específicas, tangíveis, realistas - mencione as metas se relevante)
  3. Perfil de Quem NÃO se Adapta (honesto, direto, sem medo de afastar quem não é fit cultural)

  Use tom profissional mas humano. Seja inspirador mas autêntico.

  Formato JSON:
  {
  "company_history": "texto inspirador com 2-3 parágrafos",
  "growth_opportunities": "texto detalhado com 3-4 oportunidades reais",
  "not_fit_profile": "texto direto e honesto"
  }
  `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            company_history: { type: "string" },
            growth_opportunities: { type: "string" },
            not_fit_profile: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        company_history: result.company_history || "",
        growth_opportunities: result.growth_opportunities || "",
        not_fit_profile: result.not_fit_profile || ""
      }));

      toast.success("Script gerado com sucesso!");
      setEditMode(true);
    } catch (error) {
      toast.error(error?.message || "Erro ao gerar script");
      console.error("Erro ao gerar script:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(formData);
      toast.success("Script salvo com sucesso!");
      setEditMode(false);
    } catch (error) {
      toast.error(error?.message || "Erro ao salvar script");
      console.error("Erro ao salvar:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Script de Venda do Sonho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {viewMode === "list" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Scripts Salvos</h3>
                <div className="flex gap-2">
                  {onSelectScript && selectedScript && (
                    <Button
                      onClick={() => onSelectScript(selectedScript)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Usar este Script
                    </Button>
                  )}
                  <Button onClick={() => {
                    setSelectedScript(null);
                    setFormData({
                      company_history: "",
                      mission: workshop?.mission || "",
                      vision: workshop?.vision || "",
                      values: workshop?.values || [],
                      growth_opportunities: "",
                      not_fit_profile: "",
                      success_stories: []
                    });
                    setViewMode("create");
                  }} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Script
                  </Button>
                </div>
              </div>
              <ScriptsList
                scripts={allScripts}
                onSelect={(script) => {
                  setSelectedScript(script);
                  setFormData({
                    company_history: script.company_history || "",
                    mission: script.mission || workshop?.mission || "",
                    vision: script.vision || workshop?.vision || "",
                    values: script.values || workshop?.values || [],
                    growth_opportunities: script.growth_opportunities || "",
                    not_fit_profile: script.not_fit_profile || "",
                    success_stories: script.success_stories || []
                  });
                  setViewMode("view");
                }}
                onCreateNew={() => {
                  setSelectedScript(null);
                  setFormData({
                    company_history: "",
                    mission: workshop?.mission || "",
                    vision: workshop?.vision || "",
                    values: workshop?.values || [],
                    growth_opportunities: "",
                    not_fit_profile: "",
                    success_stories: []
                  });
                  setViewMode("create");
                }}
              />
            </>
          ) : viewMode === "create" ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
                <p className="text-sm text-blue-900 font-medium">
                  💡 Preencha as informações abaixo. A IA vai usar esses dados para criar um script persuasivo e alinhado com sua cultura.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Missão da Empresa</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAudioRecorder('mission')}
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Áudio
                  </Button>
                </div>
                <Textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({...formData, mission: e.target.value})}
                  rows={2}
                  placeholder="Qual é o propósito da empresa?"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Visão da Empresa</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAudioRecorder('vision')}
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Áudio
                  </Button>
                </div>
                <Textarea
                  value={formData.vision}
                  onChange={(e) => setFormData({...formData, vision: e.target.value})}
                  rows={2}
                  placeholder="Onde a empresa quer chegar?"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Valores (separados por vírgula ou um por linha)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAudioRecorder('values')}
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Áudio
                  </Button>
                </div>
                <Textarea
                  value={Array.isArray(formData.values) ? formData.values.join(', ') : formData.values}
                  onChange={(e) => {
                    const vals = e.target.value.split(/[,\n]/).map(v => v.trim()).filter(v => v);
                    setFormData({...formData, values: vals});
                  }}
                  rows={3}
                  placeholder="Ex: Excelência, Compromisso, Transparência"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Contexto Adicional (opcional)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAudioRecorder('context')}
                  >
                    <Mic className="w-4 h-4 mr-1" />
                    Áudio
                  </Button>
                </div>
                <Textarea
                  value={formData.company_history || ""}
                  onChange={(e) => setFormData({...formData, company_history: e.target.value})}
                  rows={4}
                  placeholder="Conte um pouco da história da empresa, diferenciais, conquistas, prêmios, anos de mercado..."
                />
              </div>

              {/* Metas Financeiras */}
              {(workshop?.monthly_goals?.projected_revenue || workshop?.annual_goals?.projected_revenue) && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="text-sm font-bold text-green-800 mb-3">💰 Metas de Faturamento</p>
                  <div className="grid grid-cols-2 gap-4">
                    {workshop?.monthly_goals?.projected_revenue && (
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs text-gray-600">Meta Mensal</p>
                        <p className="text-lg font-bold text-green-700">
                          R$ {workshop.monthly_goals.projected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                    {workshop?.annual_goals?.projected_revenue && (
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs text-gray-600">Meta Anual</p>
                        <p className="text-lg font-bold text-green-700">
                          R$ {workshop.annual_goals.projected_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    ℹ️ Estas metas serão usadas pela IA para criar um script mais persuasivo
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                {allScripts.length > 0 && (
                  <Button variant="outline" onClick={() => setViewMode("list")}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={generateWithAI} disabled={generating || !formData.mission}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Script com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Script com IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : editMode ? (
            <div className="space-y-4">
              <div>
                <Label>Missão</Label>
                <Textarea
                  value={formData.mission}
                  onChange={(e) => setFormData({...formData, mission: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label>Visão</Label>
                <Textarea
                  value={formData.vision}
                  onChange={(e) => setFormData({...formData, vision: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label>História da Empresa</Label>
                <Textarea
                  value={formData.company_history}
                  onChange={(e) => setFormData({...formData, company_history: e.target.value})}
                  rows={4}
                  placeholder="Conte a história inspiradora da empresa..."
                />
              </div>

              <div>
                <Label>Oportunidades de Crescimento</Label>
                <Textarea
                  value={formData.growth_opportunities}
                  onChange={(e) => setFormData({...formData, growth_opportunities: e.target.value})}
                  rows={4}
                  placeholder="Quais oportunidades o colaborador terá aqui?"
                />
              </div>

              <div>
                <Label>Perfil de Quem NÃO se Adapta</Label>
                <Textarea
                  value={formData.not_fit_profile}
                  onChange={(e) => setFormData({...formData, not_fit_profile: e.target.value})}
                  rows={4}
                  placeholder="Seja honesto sobre quem não se encaixaria..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setEditMode(false);
                  if (allScripts.length > 0) setViewMode("list");
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Script
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Missão</h3>
                    <p className="text-gray-700">{formData.mission}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Visão</h3>
                    <p className="text-gray-700">{formData.vision}</p>
                  </div>

                  {formData.values?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Valores</h3>
                      <ul className="list-disc list-inside text-gray-700">
                        {formData.values.map((v, i) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-lg mb-2">História da Empresa</h3>
                    <p className="text-gray-700 whitespace-pre-line">{formData.company_history}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Oportunidades de Crescimento</h3>
                    <p className="text-gray-700 whitespace-pre-line">{formData.growth_opportunities}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Perfil de Quem NÃO se Adapta</h3>
                    <p className="text-gray-700 whitespace-pre-line">{formData.not_fit_profile}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-between">
                <Button onClick={() => setViewMode("list")} variant="outline">
                  Ver Todos os Scripts
                </Button>
                <div className="flex gap-2">
                  {onSelectScript && (
                    <Button
                      onClick={() => onSelectScript(selectedScript)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Usar este Script
                    </Button>
                  )}
                  <Button onClick={() => setEditMode(true)} variant="outline">
                    Editar Script
                  </Button>
                  <Button onClick={generateWithAI} disabled={generating} variant="outline">
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerar com IA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Audio Recorder Modal */}
          {showAudioRecorder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4">
                  {showAudioRecorder === 'mission' ? '🎙️ Gravar Missão' :
                   showAudioRecorder === 'vision' ? '🎙️ Gravar Visão' :
                   showAudioRecorder === 'values' ? '🎙️ Gravar Valores' :
                   '🎙️ Gravar Contexto'}
                </h3>
                <AudioRecorder
                  onAudioReady={async (audioUrl) => {
                    try {
                      toast.info("Transcrevendo áudio...");
                      const response = await fetch(audioUrl);
                      const blob = await response.blob();
                      const file = new File([blob], "audio.webm", { type: "audio/webm" });

                      const { file_url } = await base44.integrations.Core.UploadFile({ file });

                      const transcription = await base44.integrations.Core.InvokeLLM({
                        prompt: "Transcreva o áudio em texto, mantendo a fala natural mas corrigindo erros gramaticais.",
                        file_urls: [file_url]
                      });

                      if (showAudioRecorder === 'mission') {
                        setFormData({...formData, mission: transcription});
                      } else if (showAudioRecorder === 'vision') {
                        setFormData({...formData, vision: transcription});
                      } else if (showAudioRecorder === 'values') {
                        const vals = transcription.split(/[,\n]/).map(v => v.trim()).filter(v => v);
                        setFormData({...formData, values: vals});
                      } else if (showAudioRecorder === 'context') {
                        setFormData({...formData, company_history: transcription});
                      }

                      toast.success("Áudio transcrito com sucesso!");
                      setShowAudioRecorder(null);
                    } catch (error) {
                      toast.error("Erro ao transcrever áudio");
                      console.error(error);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowAudioRecorder(null)}
                  className="w-full mt-4"
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
          )}
          </DialogContent>
          </Dialog>
          );
          }
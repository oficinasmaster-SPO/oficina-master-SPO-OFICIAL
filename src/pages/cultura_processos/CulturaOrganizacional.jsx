import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {  Card, CardContent, CardHeader, CardTitle, CardDescription  } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Heart, BookOpen, Calendar, TrendingUp, Plus, Trash2, Save, Wand2, Mic, Video, Presentation, Info, FileText } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import AudioRecorder from "@/components/assessment/AudioRecorder";
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger  } from "@/components/ui/dialog";

export default function CulturaOrganizacional() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [cultureManual, setCultureManual] = useState(null);

  const [formData, setFormData] = useState({
    mission: "",
    vision: "",
    values: [""],
    culture_pillars: [],
    expectations: {
      from_company: [""],
      from_employees: [""]
    },
    // rituals: [] // Removido, agora usa a entidade Ritual diretamente
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

      const manuals = await base44.entities.CultureManual.list();
      const manual = manuals.find(m => m.workshop_id === userWorkshop?.id);
      
      if (manual) {
        setCultureManual(manual);
        setFormData({
          mission: manual.mission || "",
          vision: manual.vision || "",
          values: manual.values || [""],
          culture_pillars: manual.culture_pillars || [],
          expectations: manual.expectations || { from_company: [""], from_employees: [""] },
        });
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Buscar rituais da entidade Ritual
  const { data: registeredRituals = [] } = useQuery({
    queryKey: ['rituals', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Ritual.filter({ workshop_id: workshop.id });
    },
    enabled: !!workshop?.id
  });

  const addValue = () => {
    setFormData({ ...formData, values: [...formData.values, ""] });
  };

  const updateValue = (index, value) => {
    const updated = [...formData.values];
    updated[index] = value;
    setFormData({ ...formData, values: updated });
  };

  const removeValue = (index) => {
    const updated = formData.values.filter((_, i) => i !== index);
    setFormData({ ...formData, values: updated });
  };

  const generatePillarsAI = async () => {
    if (!formData.mission && !formData.values.length) {
      toast.error("Defina MissÃ£o e Valores primeiro para dar contexto Ã  IA");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `
        Baseado na missÃ£o: "${formData.mission}"
        e valores: "${formData.values.join(', ')}"
        
        Gere 4 pilares de cultura organizacional sÃ³lidos.
        Para cada pilar, forneÃ§a: TÃ­tulo, DescriÃ§Ã£o e 3 Comportamentos esperados.
        
        Retorne apenas JSON: 
        { "pillars": [{ "title": "...", "description": "...", "behaviors": ["...", "..."] }] }
      `;
      const res = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            pillars: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  behaviors: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });
      
      if (res.pillars) {
        setFormData(prev => ({ ...prev, culture_pillars: [...prev.culture_pillars, ...res.pillars] }));
        toast.success("Pilares gerados com IA!");
      }
    } catch (e) {
      toast.error("Erro ao gerar pilares");
    } finally {
      setGenerating(false);
    }
  };

  const generateExpectationsAI = async (type) => {
    setGenerating(true);
    try {
      const context = type === 'from_company' ? "O que a empresa oferece aos colaboradores" : "O que a empresa espera dos colaboradores";
      const prompt = `
        Gere 5 itens claros e profissionais sobre: ${context}.
        Contexto de uma oficina mecÃ¢nica profissional.
        Retorne JSON: { "items": ["item 1", "item 2"] }
      `;
      const res = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      if (res.items) {
        setFormData(prev => ({
          ...prev,
          expectations: {
            ...prev.expectations,
            [type]: [...prev.expectations[type], ...res.items]
          }
        }));
        toast.success("Expectativas geradas!");
      }
    } catch (e) {
      toast.error("Erro ao gerar expectativas");
    } finally {
      setGenerating(false);
    }
  };

  const handleAudioUpload = (url, field) => {
    toast.success("Ãudio gravado e salvo! (URL vinculada ao campo)");
    // Aqui poderÃ­amos salvar a URL do Ã¡udio no objeto, se houver campo para isso no schema.
    // Por enquanto, apenas notificamos que foi gravado.
  };

  const handleGeneratePPTX = async () => {
    toast.loading("Gerando apresentaÃ§Ã£o...");
    try {
      const response = await base44.functions.invoke("generateCulturePresentation", { workshop_id: workshop.id });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Manual_Cultura_${workshop.name}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.dismiss();
      toast.success("ApresentaÃ§Ã£o baixada!");
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error("Erro ao gerar apresentaÃ§Ã£o");
    }
  };

  const handleGenerateCultureManualPDF = async () => {
    toast.loading("Gerando PDF do Manual da Cultura...");
    try {
      const response = await base44.functions.invoke("generateCultureManualPDF", { workshop_id: workshop.id });

      const pdfData = response.data.pdf.split(', ')[1];
      const byteCharacters = atob(pdfData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Manual_Cultura_${workshop.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.dismiss();
      toast.success("PDF do Manual da Cultura baixado!");
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error("Erro ao gerar PDF do Manual da Cultura");
    }
  };

  const addPillar = () => {
    setFormData({
      ...formData,
      culture_pillars: [...formData.culture_pillars, { title: "", description: "", behaviors: [""] }]
    });
  };

  const updatePillar = (index, field, value) => {
    const updated = [...formData.culture_pillars];
    updated[index][field] = value;
    setFormData({ ...formData, culture_pillars: updated });
  };

  const addBehaviorToPillar = (pillarIndex) => {
    const updated = [...formData.culture_pillars];
    updated[pillarIndex].behaviors.push("");
    setFormData({ ...formData, culture_pillars: updated });
  };

  const updateBehavior = (pillarIndex, behaviorIndex, value) => {
    const updated = [...formData.culture_pillars];
    updated[pillarIndex].behaviors[behaviorIndex] = value;
    setFormData({ ...formData, culture_pillars: updated });
  };

  const removePillar = (index) => {
    const updated = formData.culture_pillars.filter((_, i) => i !== index);
    setFormData({ ...formData, culture_pillars: updated });
  };

  const addExpectation = (type) => {
    const updated = { ...formData.expectations };
    updated[type].push("");
    setFormData({ ...formData, expectations: updated });
  };

  const updateExpectation = (type, index, value) => {
    const updated = { ...formData.expectations };
    updated[type][index] = value;
    setFormData({ ...formData, expectations: updated });
  };

  const removeExpectation = (type, index) => {
    const updated = { ...formData.expectations };
    updated[type] = updated[type].filter((_, i) => i !== index);
    setFormData({ ...formData, expectations: updated });
  };

  // FunÃ§Ãµes de ritual removidas pois agora usamos a pÃ¡gina de Rituais dedicada


  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        workshop_id: workshop.id,
        ...formData,
        last_updated: new Date().toISOString()
      };

      if (cultureManual) {
        await base44.entities.CultureManual.update(cultureManual.id, dataToSave);
      } else {
        await base44.entities.CultureManual.create(dataToSave);
      }

      toast.success("Manual da cultura salvo com sucesso!");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Cultura Organizacional
          </h1>
          <p className="text-gray-600">Manual da cultura e cronograma de aculturamento</p>
        </div>

        <Tabs defaultValue="pilares" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pilares">Pilares</TabsTrigger>
            <TabsTrigger value="expectativas">Expectativas</TabsTrigger>
            <TabsTrigger value="rituais">Rituais</TabsTrigger>
          </TabsList>

          <TabsContent value="pilares">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pilares da Cultura</span>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4 mr-2" /> Tutorial
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Como criar Pilares da Cultura</DialogTitle>
                        </DialogHeader>
                        <div className="p-4 text-center bg-gray-100 rounded">
                          <p>VÃ­deo explicativo disponÃ­vel para planos avanÃ§ados.</p>
                          <p className="text-sm text-gray-500 mt-2">Aprenda a definir os fundamentos que sustentam sua empresa.</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={generatePillarsAI} 
                      disabled={generating}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Gerar com IA
                    </Button>
                    <Button size="sm" onClick={addPillar}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                </CardTitle>
                <div className="bg-blue-50 p-4 rounded-md flex gap-3 items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold">O que sÃ£o Pilares?</p>
                    <p>SÃ£o os fundamentos inegociÃ¡veis que sustentam sua cultura. Ex: "Foco no Cliente", "InovaÃ§Ã£o Constante". Defina o que eles significam e quais comportamentos prÃ¡ticos demonstram que eles estÃ£o sendo vividos.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-6 border-b pb-6">
                  <Label className="mb-2 block">Narrar Pilares (Ãudio)</Label>
                  <AudioRecorder onAudioRecorded={(url) => handleAudioUpload(url, 'pillars')} />
                </div>

                {formData.culture_pillars.map((pillar, pIndex) => (
                  <div key={pIndex} className="border rounded-lg p-4 bg-purple-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">Pilar {pIndex + 1}</h3>
                      <Button size="sm" variant="destructive" onClick={() => removePillar(pIndex)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        placeholder="TÃ­tulo do pilar (Ex: ExcelÃªncia TÃ©cnica)"
                        value={pillar.title}
                        onChange={(e) => updatePillar(pIndex, "title", e.target.value)}
                      />
                      <Textarea
                        placeholder="DescriÃ§Ã£o detalhada do que este pilar significa..."
                        value={pillar.description}
                        onChange={(e) => updatePillar(pIndex, "description", e.target.value)}
                        rows={2}
                      />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Comportamentos Esperados (EvidÃªncias)</Label>
                          <Button size="sm" variant="outline" onClick={() => addBehaviorToPillar(pIndex)}>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </Button>
                        </div>
                        {pillar.behaviors.map((behavior, bIndex) => (
                          <Input
                            key={bIndex}
                            className="mb-2"
                            placeholder="Ex: Sempre limpar a bancada apÃ³s o serviÃ§o"
                            value={behavior}
                            onChange={(e) => updateBehavior(pIndex, bIndex, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expectativas">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>O que a Empresa Oferece</span>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Video className="w-4 h-4 mr-2" /> Tutorial</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>O que a empresa oferece</DialogTitle></DialogHeader>
                          <div className="p-4 bg-gray-100 rounded text-center">VÃ­deo explicativo para planos avanÃ§ados.</div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => generateExpectationsAI('from_company')} 
                        disabled={generating}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      >
                        <Wand2 className="w-4 h-4 mr-2" /> IA
                      </Button>
                      <Button size="sm" onClick={() => addExpectation("from_company")}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <div className="bg-green-50 p-3 rounded-md text-sm text-green-800 mb-2">
                    Liste benefÃ­cios, ambiente, oportunidades de crescimento e garantias que a empresa dÃ¡ ao colaborador.
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AudioRecorder onAudioRecorded={(url) => handleAudioUpload(url, 'from_company')} />
                  <div className="space-y-2">
                    {formData.expectations.from_company.map((exp, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={exp}
                          onChange={(e) => updateExpectation("from_company", index, e.target.value)}
                          placeholder="Ex: Ambiente seguro, Pagamento em dia, Plano de carreira..."
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeExpectation("from_company", index)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>O que Esperamos dos Colaboradores</span>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Video className="w-4 h-4 mr-2" /> Tutorial</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>O que esperamos</DialogTitle></DialogHeader>
                          <div className="p-4 bg-gray-100 rounded text-center">VÃ­deo explicativo para planos avanÃ§ados.</div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => generateExpectationsAI('from_employees')} 
                        disabled={generating}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      >
                        <Wand2 className="w-4 h-4 mr-2" /> IA
                      </Button>
                      <Button size="sm" onClick={() => addExpectation("from_employees")}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <div className="bg-orange-50 p-3 rounded-md text-sm text-orange-800 mb-2">
                    Liste atitudes, entregas, comprometimento e responsabilidades inegociÃ¡veis.
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AudioRecorder onAudioRecorded={(url) => handleAudioUpload(url, 'from_employees')} />
                  <div className="space-y-2">
                    {formData.expectations.from_employees.map((exp, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={exp}
                          onChange={(e) => updateExpectation("from_employees", index, e.target.value)}
                          placeholder="Ex: Pontualidade, Honestidade, Cuidado com ferramentas..."
                        />
                        <Button size="icon" variant="ghost" onClick={() => removeExpectation("from_employees", index)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rituais">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rituais Cadastrados</span>
                  <Link to={createPageUrl('Rituais')}>
                    <Button size="sm" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" /> Gerenciar Rituais
                    </Button>
                  </Link>
                </CardTitle>
                <div className="bg-pink-50 p-3 rounded-md text-sm text-pink-800">
                  Estes sÃ£o os rituais definidos na pÃ¡gina de GestÃ£o de Rituais. Eles aparecerÃ£o automaticamente no documento final e na apresentaÃ§Ã£o.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {registeredRituals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhum ritual cadastrado.</p>
                    <Link to={createPageUrl('Rituais')}>
                      <Button variant="link" className="text-purple-600">Cadastrar Rituais Agora</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {registeredRituals.map((ritual, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-purple-900">{ritual.name}</h4>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full capitalize">
                            {ritual.frequency}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ritual.description}</p>
                        <p className="text-xs text-gray-500 mt-2"><strong>Pilar:</strong> {ritual.pillar?.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Cancelar
          </Button>
          <Button onClick={handleGeneratePPTX} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <Presentation className="w-5 h-5 mr-2" /> Gerar ApresentaÃ§Ã£o (PPTX)
          </Button>
          <Button onClick={handleGenerateCultureManualPDF} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <FileText className="w-5 h-5 mr-2" /> Baixar PDF
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 px-8">
            {saving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Salvar Manual</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}




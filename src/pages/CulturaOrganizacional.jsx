import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Heart, BookOpen, Calendar, TrendingUp, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function CulturaOrganizacional() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    rituals: []
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
          rituals: manual.rituals || []
        });
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

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

  const addRitual = () => {
    setFormData({
      ...formData,
      rituals: [...formData.rituals, { name: "", frequency: "semanal", description: "" }]
    });
  };

  const updateRitual = (index, field, value) => {
    const updated = [...formData.rituals];
    updated[index][field] = value;
    setFormData({ ...formData, rituals: updated });
  };

  const removeRitual = (index) => {
    const updated = formData.rituals.filter((_, i) => i !== index);
    setFormData({ ...formData, rituals: updated });
  };

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

      // Gerar atividades automáticas de aculturamento
      await generateAcculturationActivities();

      toast.success("Manual da cultura salvo com sucesso!");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const generateAcculturationActivities = async () => {
    const activities = [];
    const today = new Date();

    // Atividades de rituais recorrentes
    formData.rituals.forEach(ritual => {
      let daysToAdd = 0;
      switch (ritual.frequency) {
        case "diario": daysToAdd = 1; break;
        case "semanal": daysToAdd = 7; break;
        case "mensal": daysToAdd = 30; break;
        case "trimestral": daysToAdd = 90; break;
        case "anual": daysToAdd = 365; break;
      }

      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + daysToAdd);

      activities.push({
        workshop_id: workshop.id,
        title: ritual.name,
        description: ritual.description,
        type: "ritual",
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        responsible_id: workshop.owner_id,
        auto_generated: true
      });
    });

    // Atividade de avaliação de clima (trimestral)
    const climateDate = new Date(today);
    climateDate.setDate(today.getDate() + 90);
    activities.push({
      workshop_id: workshop.id,
      title: "Pesquisa de Clima Organizacional",
      description: "Realizar pesquisa de clima com todos os colaboradores",
      type: "avaliacao",
      scheduled_date: climateDate.toISOString().split('T')[0],
      responsible_id: workshop.owner_id,
      auto_generated: true
    });

    // Salvar todas as atividades
    for (const activity of activities) {
      try {
        await base44.entities.AcculturationActivity.create(activity);
      } catch (error) {
        console.error("Erro ao criar atividade:", error);
      }
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

        <Tabs defaultValue="basico" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="pilares">Pilares</TabsTrigger>
            <TabsTrigger value="expectativas">Expectativas</TabsTrigger>
            <TabsTrigger value="rituais">Rituais</TabsTrigger>
          </TabsList>

          <TabsContent value="basico">
            <Card>
              <CardHeader>
                <CardTitle>Missão, Visão e Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Missão</Label>
                  <Textarea
                    value={formData.mission}
                    onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                    placeholder="Qual é o propósito da empresa?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Visão</Label>
                  <Textarea
                    value={formData.vision}
                    onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                    placeholder="Onde a empresa quer chegar?"
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Valores</Label>
                    <Button size="sm" onClick={addValue}>
                      <Plus className="w-4 h-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                  {formData.values.map((value, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={value}
                        onChange={(e) => updateValue(index, e.target.value)}
                        placeholder="Ex: Respeito, Transparência..."
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeValue(index)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pilares">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pilares da Cultura</span>
                  <Button size="sm" onClick={addPillar}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Pilar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                        placeholder="Título do pilar"
                        value={pillar.title}
                        onChange={(e) => updatePillar(pIndex, "title", e.target.value)}
                      />
                      <Textarea
                        placeholder="Descrição"
                        value={pillar.description}
                        onChange={(e) => updatePillar(pIndex, "description", e.target.value)}
                        rows={2}
                      />
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm">Comportamentos Esperados</Label>
                          <Button size="sm" variant="outline" onClick={() => addBehaviorToPillar(pIndex)}>
                            <Plus className="w-3 h-3 mr-1" /> Adicionar
                          </Button>
                        </div>
                        {pillar.behaviors.map((behavior, bIndex) => (
                          <Input
                            key={bIndex}
                            className="mb-2"
                            placeholder="Comportamento esperado"
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
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>O que a Empresa Oferece</span>
                    <Button size="sm" onClick={() => addExpectation("from_company")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formData.expectations.from_company.map((exp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={exp}
                        onChange={(e) => updateExpectation("from_company", index, e.target.value)}
                        placeholder="Ex: Ambiente seguro..."
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeExpectation("from_company", index)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>O que Esperamos dos Colaboradores</span>
                    <Button size="sm" onClick={() => addExpectation("from_employees")}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formData.expectations.from_employees.map((exp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={exp}
                        onChange={(e) => updateExpectation("from_employees", index, e.target.value)}
                        placeholder="Ex: Comprometimento..."
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeExpectation("from_employees", index)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rituais">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Rituais e Cerimônias</span>
                  <Button size="sm" onClick={addRitual}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Ritual
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.rituals.map((ritual, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-pink-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Ritual {index + 1}</h3>
                      <Button size="sm" variant="destructive" onClick={() => removeRitual(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Nome do ritual"
                        value={ritual.name}
                        onChange={(e) => updateRitual(index, "name", e.target.value)}
                      />
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={ritual.frequency}
                        onChange={(e) => updateRitual(index, "frequency", e.target.value)}
                      >
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <Textarea
                      className="mt-3"
                      placeholder="Descrição do ritual"
                      value={ritual.description}
                      onChange={(e) => updateRitual(index, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
            Cancelar
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
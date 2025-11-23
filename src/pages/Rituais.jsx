import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Sparkles, Target, Eye, Heart, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const pillarLabels = {
  proposito: { label: "Propósito", icon: Target, color: "blue" },
  missao: { label: "Missão", icon: Target, color: "green" },
  visao: { label: "Visão", icon: Eye, color: "purple" },
  valores: { label: "Valores", icon: Heart, color: "pink" },
  postura_atitudes: { label: "Postura e Atitudes", icon: Users, color: "indigo" },
  comportamentos_inaceitaveis: { label: "Comportamentos Inaceitáveis", icon: Users, color: "red" },
  rituais_cultura: { label: "Rituais de Cultura", icon: Sparkles, color: "yellow" },
  sistemas_regras: { label: "Sistemas e Regras", icon: TrendingUp, color: "cyan" },
  comunicacao_interna: { label: "Comunicação Interna", icon: Users, color: "orange" },
  lideranca: { label: "Liderança", icon: Users, color: "violet" },
  foco_cliente: { label: "Foco no Cliente", icon: Heart, color: "rose" },
  performance_responsabilidade: { label: "Performance e Responsabilidade", icon: TrendingUp, color: "emerald" },
  desenvolvimento_continuo: { label: "Desenvolvimento Contínuo", icon: TrendingUp, color: "teal" },
  identidade_pertencimento: { label: "Identidade e Pertencimento", icon: Sparkles, color: "fuchsia" }
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

const defaultRituals = [
  { name: "Ritual de Alinhamento Cultural", pillar: "rituais_cultura", frequency: "mensal" },
  { name: "Ritual do Dono (Pensar Como Dono)", pillar: "postura_atitudes", frequency: "continuo" },
  { name: "Ritual da Excelência", pillar: "foco_cliente", frequency: "continuo" },
  { name: "Ritual de Clareza", pillar: "comunicacao_interna", frequency: "continuo" },
  { name: "Ritual de Conexão", pillar: "identidade_pertencimento", frequency: "semanal" },
  { name: "Ritual da Mesa Redonda", pillar: "lideranca", frequency: "mensal" },
  { name: "Ritual do Start Diário", pillar: "rituais_cultura", frequency: "diario" },
  { name: "Ritual da Entrega", pillar: "performance_responsabilidade", frequency: "continuo" },
  { name: "Ritual da Responsabilidade", pillar: "performance_responsabilidade", frequency: "continuo" },
  { name: "Ritual da Maturidade Profissional", pillar: "desenvolvimento_continuo", frequency: "trimestral" },
  { name: "Ritual da Alta Performance", pillar: "performance_responsabilidade", frequency: "mensal" },
  { name: "Ritual do Foco no Cliente", pillar: "foco_cliente", frequency: "continuo" },
  { name: "Ritual da Confiança", pillar: "valores", frequency: "continuo" },
  { name: "Ritual da Voz Ativa", pillar: "comunicacao_interna", frequency: "continuo" },
  { name: "Ritual da Consistência", pillar: "valores", frequency: "continuo" },
  { name: "Ritual da Cultura Viva", pillar: "rituais_cultura", frequency: "mensal" },
  { name: "Ritual da Transparência", pillar: "valores", frequency: "continuo" },
  { name: "Ritual da Ação Imediata", pillar: "postura_atitudes", frequency: "continuo" },
  { name: "Ritual do Planejamento Vivo", pillar: "sistemas_regras", frequency: "semanal" },
  { name: "Ritual de Abertura de Semana (Kick Off)", pillar: "rituais_cultura", frequency: "semanal" },
  { name: "Ritual da Virada", pillar: "lideranca", frequency: "eventual" },
  { name: "Ritual do Compromisso", pillar: "valores", frequency: "continuo" },
  { name: "Ritual da Semana do Dono", pillar: "postura_atitudes", frequency: "semanal" },
  { name: "Ritual do Checkpoint", pillar: "rituais_cultura", frequency: "semanal" },
  { name: "Ritual do Feedback Contínuo", pillar: "rituais_cultura", frequency: "continuo" },
  { name: "Ritual do Pulso da Cultura", pillar: "rituais_cultura", frequency: "mensal" },
  { name: "Ritual do Norte Claro", pillar: "visao", frequency: "trimestral" },
  { name: "Ritual da Postura", pillar: "postura_atitudes", frequency: "continuo" },
  { name: "Ritual da Presença", pillar: "postura_atitudes", frequency: "diario" },
  { name: "Ritual da Identidade", pillar: "identidade_pertencimento", frequency: "mensal" },
  { name: "Ritual da Força Operacional", pillar: "performance_responsabilidade", frequency: "semanal" },
  { name: "Ritual do Flow da Equipe", pillar: "lideranca", frequency: "semanal" },
  { name: "Ritual do Compromisso Ativo", pillar: "valores", frequency: "continuo" },
  { name: "Ritual das 3 Verdades (clareza – responsabilidade – entrega)", pillar: "rituais_cultura", frequency: "diario" }
];

export default function Rituais() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [workshop, setWorkshop] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);
  const [filterPillar, setFilterPillar] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pillar: "rituais_cultura",
    frequency: "semanal",
    responsible_role: "",
    implementation_steps: [""]
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshops, isLoading: loadingWorkshop } = useQuery({
    queryKey: ['workshops', user?.id],
    queryFn: async () => {
      const data = await base44.entities.Workshop.list();
      const userWorkshop = data.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);
      return data;
    },
    enabled: !!user
  });

  const { data: rituals = [], isLoading } = useQuery({
    queryKey: ['rituals', workshop?.id],
    queryFn: () => base44.entities.Ritual.filter({ workshop_id: workshop.id }),
    enabled: !!workshop
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ritual.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      setDialogOpen(false);
      resetForm();
      toast.success("Ritual criado!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ritual.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      setDialogOpen(false);
      setEditingRitual(null);
      resetForm();
      toast.success("Ritual atualizado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ritual.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['rituals']);
      toast.success("Ritual removido!");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      pillar: "rituais_cultura",
      frequency: "semanal",
      responsible_role: "",
      implementation_steps: [""]
    });
  };

  const handleSubmit = () => {
    if (!workshop) return;

    const data = {
      ...formData,
      workshop_id: workshop.id,
      implementation_steps: formData.implementation_steps.filter(s => s.trim())
    };

    if (editingRitual) {
      updateMutation.mutate({ id: editingRitual.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (ritual) => {
    setEditingRitual(ritual);
    setFormData({
      name: ritual.name,
      description: ritual.description || "",
      pillar: ritual.pillar,
      frequency: ritual.frequency || "semanal",
      responsible_role: ritual.responsible_role || "",
      implementation_steps: ritual.implementation_steps?.length > 0 ? ritual.implementation_steps : [""]
    });
    setDialogOpen(true);
  };

  const handleImportDefaults = async () => {
    if (!workshop) return;

    try {
      for (const ritual of defaultRituals) {
        await base44.entities.Ritual.create({
          ...ritual,
          workshop_id: workshop.id,
          description: `${ritual.name} - implementar conforme a necessidade da oficina.`
        });
      }
      queryClient.invalidateQueries(['rituals']);
      toast.success("Rituais padrão importados!");
    } catch (error) {
      toast.error("Erro ao importar rituais");
    }
  };

  const filteredRituals = filterPillar === "all" 
    ? rituals 
    : rituals.filter(r => r.pillar === filterPillar);

  const ritualsByPillar = filteredRituals.reduce((acc, ritual) => {
    if (!acc[ritual.pillar]) acc[ritual.pillar] = [];
    acc[ritual.pillar].push(ritual);
    return acc;
  }, {});

  if (isLoading || loadingWorkshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="ml-3 text-gray-600">Carregando rituais...</p>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Você precisa cadastrar uma oficina primeiro</p>
            <Button onClick={() => navigate(createPageUrl("Cadastro"))}>
              Cadastrar Oficina
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rituais Organizacionais</h1>
            <p className="text-gray-600">Gerencie os rituais de cultura da sua oficina</p>
          </div>
          <div className="flex gap-3">
            {rituals.length === 0 && (
              <Button onClick={handleImportDefaults} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Importar Rituais Padrão
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingRitual(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Ritual
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRitual ? "Editar Ritual" : "Novo Ritual"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Ritual *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Ritual do Start Diário"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva o objetivo e como executar este ritual..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pilar Cultural *</Label>
                      <Select value={formData.pillar} onValueChange={(v) => setFormData({...formData, pillar: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(pillarLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Frequência *</Label>
                      <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(frequencyLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Input
                      value={formData.responsible_role}
                      onChange={(e) => setFormData({...formData, responsible_role: e.target.value})}
                      placeholder="Ex: Líder, Dono, Todos"
                    />
                  </div>
                  <div>
                    <Label>Passos de Implementação</Label>
                    {formData.implementation_steps.map((step, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={step}
                          onChange={(e) => {
                            const newSteps = [...formData.implementation_steps];
                            newSteps[index] = e.target.value;
                            setFormData({...formData, implementation_steps: newSteps});
                          }}
                          placeholder={`Passo ${index + 1}`}
                        />
                        {index === formData.implementation_steps.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setFormData({
                              ...formData,
                              implementation_steps: [...formData.implementation_steps, ""]
                            })}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingRitual ? "Atualizar" : "Criar"} Ritual
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <Select value={filterPillar} onValueChange={setFilterPillar}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Pilares</SelectItem>
              {Object.entries(pillarLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rituals.length === 0 ? (
          <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Implemente os Rituais na sua Oficina</h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Temos 34 rituais organizacionais prontos para você implementar, organizados em 14 pilares culturais.
                Clique abaixo para importar todos os rituais e começar a fortalecer a cultura da sua empresa.
              </p>
              <Button 
                onClick={handleImportDefaults} 
                size="lg"
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg px-8 py-6"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Importar 34 Rituais Padrão
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Você poderá editar, personalizar ou remover qualquer ritual depois
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(ritualsByPillar).map(([pillar, pillarRituals]) => {
              const pillarInfo = pillarLabels[pillar];
              const Icon = pillarInfo.icon;
              
              return (
                <div key={pillar}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className={`w-6 h-6 text-${pillarInfo.color}-600`} />
                    <h2 className="text-2xl font-bold text-gray-900">{pillarInfo.label}</h2>
                    <Badge variant="outline">{pillarRituals.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pillarRituals.map((ritual) => (
                      <Card key={ritual.id} className="hover:shadow-lg transition-shadow border-l-4" style={{borderLeftColor: `var(--${pillarInfo.color}-500, #3b82f6)`}}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg flex-1">{ritual.name}</CardTitle>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(ritual)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("Remover este ritual?")) {
                                    deleteMutation.mutate(ritual.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{frequencyLabels[ritual.frequency]}</Badge>
                            {ritual.responsible_role && (
                              <Badge variant="outline">{ritual.responsible_role}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {ritual.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{ritual.description}</p>
                          )}
                          {ritual.implementation_steps && ritual.implementation_steps.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Passos:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {ritual.implementation_steps.slice(0, 2).map((step, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span className="line-clamp-1">{step}</span>
                                  </li>
                                ))}
                                {ritual.implementation_steps.length > 2 && (
                                  <li className="text-gray-400 italic">
                                    +{ritual.implementation_steps.length - 2} mais...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
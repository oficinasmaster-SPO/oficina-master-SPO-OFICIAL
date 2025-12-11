import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function GerenciarTemplatesAtendimento() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "acompanhamento_mensal",
    duracao_minutos: 60,
    pauta: [{ titulo: "", descricao: "", tempo_estimado: 15 }],
    objetivos: [""]
  });

  // Carregar templates (armazenados localmente via localStorage ou criar entidade)
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('templates_atendimento');
    return saved ? JSON.parse(saved) : [];
  });

  const saveTemplates = (newTemplates) => {
    setTemplates(newTemplates);
    localStorage.setItem('templates_atendimento', JSON.stringify(newTemplates));
  };

  const handleSave = () => {
    if (!formData.nome) {
      toast.error('Nome do template é obrigatório');
      return;
    }

    const template = {
      id: editingTemplate?.id || Date.now().toString(),
      ...formData,
      pauta: formData.pauta.filter(p => p.titulo),
      objetivos: formData.objetivos.filter(o => o)
    };

    if (editingTemplate) {
      const updated = templates.map(t => t.id === editingTemplate.id ? template : t);
      saveTemplates(updated);
      toast.success('Template atualizado!');
    } else {
      saveTemplates([...templates, template]);
      toast.success('Template criado!');
    }

    resetForm();
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData(template);
  };

  const handleDelete = (id) => {
    if (confirm('Deseja realmente excluir este template?')) {
      saveTemplates(templates.filter(t => t.id !== id));
      toast.success('Template excluído!');
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      nome: "",
      tipo: "acompanhamento_mensal",
      duracao_minutos: 60,
      pauta: [{ titulo: "", descricao: "", tempo_estimado: 15 }],
      objetivos: [""]
    });
  };

  const addPauta = () => {
    setFormData({
      ...formData,
      pauta: [...formData.pauta, { titulo: "", descricao: "", tempo_estimado: 15 }]
    });
  };

  const addObjetivo = () => {
    setFormData({
      ...formData,
      objetivos: [...formData.objetivos, ""]
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Templates de Atendimento</h1>
        <p className="text-gray-600 mt-2">
          Crie e edite templates personalizados para agilizar o registro de atendimentos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Template *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Acompanhamento Mensal Padrão"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnostico_inicial">Diagnóstico Inicial</SelectItem>
                    <SelectItem value="acompanhamento_mensal">Acompanhamento Mensal</SelectItem>
                    <SelectItem value="reuniao_estrategica">Reunião Estratégica</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="auditoria">Auditoria</SelectItem>
                    <SelectItem value="revisao_metas">Revisão de Metas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  value={formData.duracao_minutos}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Pauta</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPauta}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {formData.pauta.map((p, idx) => (
                  <div key={idx} className="space-y-2 border p-3 rounded-lg">
                    <Input
                      placeholder="Título"
                      value={p.titulo}
                      onChange={(e) => {
                        const newP = [...formData.pauta];
                        newP[idx].titulo = e.target.value;
                        setFormData({ ...formData, pauta: newP });
                      }}
                    />
                    <Textarea
                      placeholder="Descrição"
                      value={p.descricao}
                      onChange={(e) => {
                        const newP = [...formData.pauta];
                        newP[idx].descricao = e.target.value;
                        setFormData({ ...formData, pauta: newP });
                      }}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Tempo (min)"
                        className="w-32"
                        value={p.tempo_estimado}
                        onChange={(e) => {
                          const newP = [...formData.pauta];
                          newP[idx].tempo_estimado = parseInt(e.target.value);
                          setFormData({ ...formData, pauta: newP });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newP = formData.pauta.filter((_, i) => i !== idx);
                          setFormData({ ...formData, pauta: newP });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Objetivos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addObjetivo}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.objetivos.map((obj, idx) => (
                  <Input
                    key={idx}
                    placeholder={`Objetivo ${idx + 1}`}
                    value={obj}
                    onChange={(e) => {
                      const newObj = [...formData.objetivos];
                      newObj[idx] = e.target.value;
                      setFormData({ ...formData, objetivos: newObj });
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {editingTemplate && (
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Atualizar' : 'Salvar'} Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Templates Salvos ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhum template criado ainda</p>
                <p className="text-sm mt-2">Crie seu primeiro template ao lado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.nome}</h3>
                        <p className="text-sm text-gray-600">
                          {template.tipo.replace(/_/g, ' ')} • {template.duracao_minutos}min
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>• {template.pauta.length} tópicos na pauta</p>
                      <p>• {template.objetivos.length} objetivos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
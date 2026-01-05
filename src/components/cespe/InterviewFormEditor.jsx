import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function InterviewFormEditor({ form, workshopId, onSaveComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    form_name: form?.form_name || "",
    form_type: form?.form_type || "custom",
    position: form?.position || "",
    description: form?.description || "",
    questions: form?.questions || [],
    is_active: form?.is_active !== undefined ? form.is_active : true
  });

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question_text: "",
          category: "tecnica",
          weight: 1,
          expected_answer: "",
          scoring_guide: ""
        }
      ]
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        workshop_id: workshopId
      };

      if (form?.id) {
        return await base44.entities.InterviewForm.update(form.id, payload);
      } else {
        return await base44.entities.InterviewForm.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      toast.success(form ? "Formulário atualizado!" : "Formulário criado!");
      onSaveComplete();
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao salvar formulário");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.form_name.trim()) {
      toast.error("Digite o nome do formulário");
      return;
    }
    if (formData.questions.length === 0) {
      toast.error("Adicione pelo menos uma pergunta");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Nome do Formulário *</Label>
            <Input
              value={formData.form_name}
              onChange={(e) => setFormData({...formData, form_name: e.target.value})}
              placeholder="Ex: Formulário Técnico para Eletricista"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo do Formulário</Label>
              <select
                value={formData.form_type}
                onChange={(e) => setFormData({...formData, form_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="pre_entrevista">Pré-Entrevista</option>
                <option value="tecnico">Técnico</option>
                <option value="comportamental">Comportamental</option>
                <option value="cultural">Cultural</option>
                <option value="vendas">Vendas</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div>
              <Label>Cargo Específico (opcional)</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                placeholder="Ex: Eletricista, Mecânico..."
              />
            </div>
          </div>

          <div>
            <Label>Descrição do Formulário</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descreva quando e como este formulário deve ser usado..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Formulário ativo
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Perguntas do Formulário</h3>
          <Button type="button" onClick={addQuestion} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pergunta
          </Button>
        </div>

        {formData.questions.map((question, index) => (
          <Card key={index}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="font-medium">Pergunta {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>

              <div>
                <Label>Texto da Pergunta *</Label>
                <Textarea
                  value={question.question_text}
                  onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                  placeholder="Digite a pergunta..."
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <select
                    value={question.category}
                    onChange={(e) => updateQuestion(index, 'category', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="tecnica">Técnica</option>
                    <option value="comportamental">Comportamental</option>
                    <option value="cultural">Cultural</option>
                  </select>
                </div>

                <div>
                  <Label>Peso (1-5)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={question.weight}
                    onChange={(e) => updateQuestion(index, 'weight', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label>Resposta Esperada (opcional)</Label>
                <Textarea
                  value={question.expected_answer}
                  onChange={(e) => updateQuestion(index, 'expected_answer', e.target.value)}
                  placeholder="Qual seria uma boa resposta?"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Formulário"}
        </Button>
      </div>
    </form>
  );
}
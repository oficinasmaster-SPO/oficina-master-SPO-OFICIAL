import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function QuestionFormEditor({ question, workshopId, onSaveComplete, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    question_text: question?.question_text || "",
    category: question?.category || "tecnica",
    position: question?.position || "",
    weight: question?.weight || 1,
    expected_answer: question?.expected_answer || "",
    scoring_guide: question?.scoring_guide || "",
    active: question?.active !== undefined ? question.active : true
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        workshop_id: workshopId,
        is_system_default: false
      };

      if (question?.id) {
        return await base44.entities.InterviewQuestion.update(question.id, payload);
      } else {
        return await base44.entities.InterviewQuestion.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions'] });
      toast.success(question ? "Pergunta atualizada!" : "Pergunta criada!");
      onSaveComplete();
    },
    onError: (error) => {
      toast.error(error?.message || "Erro ao salvar pergunta");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question_text.trim()) {
      toast.error("Digite o texto da pergunta");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Texto da Pergunta *</Label>
            <Textarea
              value={formData.question_text}
              onChange={(e) => setFormData({...formData, question_text: e.target.value})}
              placeholder="Digite a pergunta que será feita ao candidato..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="tecnica">Técnica</option>
                <option value="comportamental">Comportamental</option>
                <option value="cultural">Cultural</option>
              </select>
            </div>

            <div>
              <Label>Peso da Pergunta</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value)})}
              />
              <p className="text-xs text-gray-500 mt-1">1 = baixo impacto, 5 = alto impacto</p>
            </div>
          </div>

          <div>
            <Label>Cargo Específico (opcional)</Label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              placeholder="Ex: Técnico Automotivo, Vendedor..."
            />
            <p className="text-xs text-gray-500 mt-1">Deixe vazio para aplicar a todos os cargos</p>
          </div>

          <div>
            <Label>Resposta Esperada (opcional)</Label>
            <Textarea
              value={formData.expected_answer}
              onChange={(e) => setFormData({...formData, expected_answer: e.target.value})}
              placeholder="Qual seria uma boa resposta para esta pergunta?"
              rows={2}
            />
          </div>

          <div>
            <Label>Guia de Pontuação (opcional)</Label>
            <Textarea
              value={formData.scoring_guide}
              onChange={(e) => setFormData({...formData, scoring_guide: e.target.value})}
              placeholder="Orientações para pontuar a resposta..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
              className="w-4 h-4"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Pergunta ativa (aparecerá nas entrevistas)
            </Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Pergunta"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
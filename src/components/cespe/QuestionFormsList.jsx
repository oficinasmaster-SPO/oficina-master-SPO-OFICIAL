import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const categoryLabels = {
  tecnica: "Técnica",
  comportamental: "Comportamental",
  cultural: "Cultural"
};

const categoryColors = {
  tecnica: "bg-blue-100 text-blue-800",
  comportamental: "bg-purple-100 text-purple-800",
  cultural: "bg-green-100 text-green-800"
};

export default function QuestionFormsList({ questions, onEdit, workshopId }) {
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }) => {
      return await base44.entities.InterviewQuestion.update(id, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions'] });
      toast.success("Status atualizado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.InterviewQuestion.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-questions'] });
      toast.success("Pergunta excluída!");
    }
  });

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma pergunta cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedQuestions).map(([category, items]) => (
        <div key={category}>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Badge className={categoryColors[category]}>
              {categoryLabels[category]}
            </Badge>
            <span className="text-sm text-gray-500">({items.length})</span>
          </h3>
          <div className="space-y-2">
            {items.map((question) => (
              <Card key={question.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">
                        {question.question_text}
                      </p>
                      {question.position && (
                        <Badge variant="outline" className="text-xs">
                          Cargo: {question.position}
                        </Badge>
                      )}
                      {question.expected_answer && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Resposta esperada:</strong> {question.expected_answer}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate({
                          id: question.id,
                          active: !question.active
                        })}
                      >
                        {question.active ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(question)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir esta pergunta?")) {
                            deleteMutation.mutate(question.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
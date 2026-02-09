import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Eye, EyeOff, ClipboardList, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const formTypeLabels = {
  pre_entrevista: "Pré-Entrevista",
  tecnico: "Técnico",
  comportamental: "Comportamental",
  cultural: "Cultural",
  vendas: "Vendas",
  custom: "Personalizado"
};

const formTypeColors = {
  pre_entrevista: "bg-yellow-100 text-yellow-800",
  tecnico: "bg-blue-100 text-blue-800",
  comportamental: "bg-purple-100 text-purple-800",
  cultural: "bg-green-100 text-green-800",
  vendas: "bg-orange-100 text-orange-800",
  custom: "bg-gray-100 text-gray-800"
};

export default function InterviewFormsList({ forms, onEdit, workshopId, onSelect }) {
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return await base44.entities.InterviewForm.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      toast.success("Status atualizado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.InterviewForm.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-forms'] });
      toast.success("Formulário excluído!");
    }
  });

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Nenhum formulário cadastrado ainda.</p>
        <p className="text-gray-400 text-sm mt-2">Clique em "Novo Formulário" para começar</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {forms.map((form) => (
        <Card key={form.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{form.form_name}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={formTypeColors[form.form_type]}>
                    {formTypeLabels[form.form_type]}
                  </Badge>
                  {form.position && (
                    <Badge variant="outline">{form.position}</Badge>
                  )}
                  {form.is_active ? (
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {form.description && (
              <p className="text-sm text-gray-600 mb-4">{form.description}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {form.questions?.length || 0} perguntas
                </span>
                {onSelect && (
                  <Button
                    size="sm"
                    onClick={() => onSelect(form)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Usar
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActiveMutation.mutate({
                    id: form.id,
                    is_active: !form.is_active
                  })}
                >
                  {form.is_active ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(form)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja excluir o formulário "${form.form_name}"?`)) {
                      deleteMutation.mutate(form.id);
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
  );
}
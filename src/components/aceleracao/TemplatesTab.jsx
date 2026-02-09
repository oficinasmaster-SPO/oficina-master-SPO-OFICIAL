import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesTab({ user }) {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      nome: "Diagnóstico Inicial",
      tipo: "diagnostico_inicial",
      duracao: 120,
      pauta: [
        { titulo: "Apresentação", descricao: "Conhecer a empresa e equipe", tempo_estimado: 20 },
        { titulo: "Avaliação Atual", descricao: "Diagnóstico da situação", tempo_estimado: 60 }
      ],
      objetivos: ["Conhecer estrutura", "Identificar pontos de melhoria"]
    }
  ]);

  const [editando, setEditando] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Templates de Atendimento</h2>
        <Button onClick={() => setEditando({ novo: true })}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{template.nome}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditando(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setTemplates(templates.filter(t => t.id !== template.id));
                      toast.success('Template excluído');
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Tipo:</span> {template.tipo}</p>
                <p><span className="font-medium">Duração:</span> {template.duracao} minutos</p>
                <p><span className="font-medium">Itens da Pauta:</span> {template.pauta.length}</p>
                <p><span className="font-medium">Objetivos:</span> {template.objetivos.length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de edição seria implementado aqui */}
    </div>
  );
}
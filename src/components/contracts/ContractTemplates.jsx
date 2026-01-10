import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function ContractTemplates({ user }) {
  const [templates, setTemplates] = useState([
    {
      id: "1",
      name: "Contrato Padrão - Aceleração 12 meses",
      plan_type: "BRONZE",
      content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA

CONTRATANTE: {{workshop_name}}
CNPJ: {{cnpj}}

CONTRATADA: Oficinas Master Ltda.

PLANO: {{plan_type}}
VALOR: R$ {{contract_value}}
DURAÇÃO: {{duration}} meses

...`
    }
  ]);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    plan_type: "",
    content: ""
  });

  const [editingId, setEditingId] = useState(null);

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Preencha nome e conteúdo do template");
      return;
    }

    setTemplates([...templates, {
      id: Date.now().toString(),
      ...newTemplate
    }]);
    setNewTemplate({ name: "", plan_type: "", content: "" });
    toast.success("Template criado!");
  };

  const deleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success("Template removido!");
  };

  const copyTemplate = (template) => {
    navigator.clipboard.writeText(template.content);
    toast.success("Template copiado!");
  };

  return (
    <div className="space-y-6">
      {/* Criar Novo Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Template</Label>
            <Input
              placeholder="Ex: Contrato GOLD - 24 meses"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Plano Associado (opcional)</Label>
            <Input
              placeholder="Ex: GOLD"
              value={newTemplate.plan_type}
              onChange={(e) => setNewTemplate({ ...newTemplate, plan_type: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Conteúdo do Template</Label>
            <Textarea
              placeholder="Use variáveis como {{workshop_name}}, {{cnpj}}, {{plan_type}}, {{contract_value}}, {{duration}}..."
              value={newTemplate.content}
              onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <Button onClick={addTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Salvar Template
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates Salvos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    {template.plan_type && (
                      <p className="text-sm text-gray-600">Plano: {template.plan_type}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyTemplate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto max-h-40">
                  {template.content}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
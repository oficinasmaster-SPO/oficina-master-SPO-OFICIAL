import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Copy, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { TRAFEGO_PAGO_TEMPLATE } from "./templates/TrafegoPagoTemplate";
import { CONSULTORIA_GOLD_TEMPLATE } from "./templates/ConsultoriaGoldTemplate";
import TemplateEditor from "./TemplateEditor";
import TemplateVersionHistory from "./TemplateVersionHistory";

function createInitialVersion(content) {
  return {
    id: Date.now().toString(),
    version: 1,
    content,
    change_note: "Versão inicial",
    edited_by: "Sistema",
    created_at: new Date().toISOString()
  };
}

export default function ContractTemplates({ user }) {
  const [templates, setTemplates] = useState([
    {
      id: "trafego-pago-matrix",
      name: "Contrato MATRIX - Tráfego Pago e Performance Digital",
      plan_type: "Todos",
      description: "Contrato completo com 18 cláusulas para serviços de tráfego pago (Google Ads e Meta Ads)",
      content: TRAFEGO_PAGO_TEMPLATE,
      isDefault: true,
      versions: [createInitialVersion(TRAFEGO_PAGO_TEMPLATE)]
    },
    {
      id: "consultoria-gold",
      name: "Contrato GOLD - Consultoria e Aceleração de Resultados",
      plan_type: "GOLD",
      description: "Contrato B2B completo com 18 cláusulas, 4 marcos contratuais, licenciamento de conteúdo digital, plataforma SPO e serviços consultivos estratégicos.",
      content: CONSULTORIA_GOLD_TEMPLATE,
      isDefault: true,
      versions: [createInitialVersion(CONSULTORIA_GOLD_TEMPLATE)]
    }
  ]);

  const [newTemplate, setNewTemplate] = useState({ name: "", plan_type: "", content: "" });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [historyTemplate, setHistoryTemplate] = useState(null);

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Preencha nome e conteúdo do template");
      return;
    }
    const id = Date.now().toString();
    setTemplates([...templates, {
      id,
      ...newTemplate,
      versions: [createInitialVersion(newTemplate.content)]
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

  const handleSaveVersion = ({ templateId, content, changeNote }) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== templateId) return t;
      const currentMaxVersion = t.versions.length > 0
        ? Math.max(...t.versions.map(v => v.version))
        : 0;
      const newVersion = {
        id: Date.now().toString(),
        version: currentMaxVersion + 1,
        content,
        change_note: changeNote,
        edited_by: user?.full_name || "Usuário",
        created_at: new Date().toISOString()
      };
      return {
        ...t,
        content,
        versions: [newVersion, ...t.versions]
      };
    }));
    toast.success("Nova versão salva com sucesso!");
  };

  const handleRestoreVersion = (templateId) => (version) => {
    handleSaveVersion({
      templateId,
      content: version.content,
      changeNote: `Restaurada versão v${version.version}`
    });
    toast.success(`Versão v${version.version} restaurada!`);
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
          <div className="grid md:grid-cols-2 gap-4">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      {template.isDefault && (
                        <Badge className="bg-blue-100 text-blue-700">Padrão</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        v{template.versions?.[0]?.version || 1}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-1">{template.description}</p>
                    )}
                    {template.plan_type && (
                      <p className="text-xs text-gray-500">Plano: {template.plan_type}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(template)}
                      title="Editar template (cria nova versão)"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHistoryTemplate(template)}
                      title="Histórico de versões"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyTemplate(template)}
                      title="Copiar template"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!template.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTemplate(template.id)}
                        title="Excluir template"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {template.content.substring(0, 500)}...
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor Modal */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          onSave={handleSaveVersion}
        />
      )}

      {/* Histórico de Versões Modal */}
      {historyTemplate && (
        <TemplateVersionHistory
          versions={historyTemplate.versions || []}
          onRestore={handleRestoreVersion(historyTemplate.id)}
          open={!!historyTemplate}
          onOpenChange={(open) => !open && setHistoryTemplate(null)}
        />
      )}
    </div>
  );
}
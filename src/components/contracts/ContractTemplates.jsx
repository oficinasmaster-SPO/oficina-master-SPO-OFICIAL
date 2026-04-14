import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Copy, Pencil, Clock, DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TRAFEGO_PAGO_TEMPLATE } from "./templates/TrafegoPagoTemplate";
import { CONSULTORIA_GOLD_TEMPLATE } from "./templates/ConsultoriaGoldTemplate";
import TemplateEditor from "./TemplateEditor";
import TemplateVersionHistory from "./TemplateVersionHistory";

function createInitialVersion(content, userName) {
  return {
    id: Date.now().toString(),
    version: 1,
    content,
    change_note: "Versão inicial",
    edited_by: userName || "Sistema",
    created_at: new Date().toISOString()
  };
}

const defaultTemplates = [
  {
    name: "Contrato MATRIX - Tráfego Pago e Performance Digital",
    plan_type: "Todos",
    description: "Contrato completo com 18 cláusulas para serviços de tráfego pago (Google Ads e Meta Ads)",
    content: TRAFEGO_PAGO_TEMPLATE,
    isDefault: true
  },
  {
    name: "Contrato GOLD - Consultoria e Aceleração de Resultados",
    plan_type: "GOLD",
    description: "Contrato B2B completo com 18 cláusulas, 4 marcos contratuais, licenciamento de conteúdo digital, plataforma SPO e serviços consultivos estratégicos.",
    content: CONSULTORIA_GOLD_TEMPLATE,
    isDefault: true
  }
];

export default function ContractTemplates({ user }) {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contract_templates'],
    queryFn: () => base44.entities.ContractTemplate.list('-created_date', 100),
  });

  const [newTemplate, setNewTemplate] = useState({ name: "", plan_type: "", content: "" });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [historyTemplate, setHistoryTemplate] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContractTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_templates'] });
      toast.success("Template criado!");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContractTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_templates'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContractTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_templates'] });
      toast.success("Template removido!");
    }
  });

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Preencha nome e conteúdo do template");
      return;
    }
    createMutation.mutate({
      ...newTemplate,
      versions: [createInitialVersion(newTemplate.content, user?.full_name)]
    });
    setNewTemplate({ name: "", plan_type: "", content: "" });
  };

  const loadDefaultTemplates = async () => {
    try {
      for (const t of defaultTemplates) {
        await base44.entities.ContractTemplate.create({
          ...t,
          versions: [createInitialVersion(t.content, "Sistema")]
        });
      }
      queryClient.invalidateQueries({ queryKey: ['contract_templates'] });
      toast.success("Templates padrão carregados com sucesso!");
    } catch (e) {
      toast.error("Erro ao carregar templates padrão.");
    }
  };

  const deleteTemplate = (id) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteMutation.mutate(id);
    }
  };

  const copyTemplate = (template) => {
    navigator.clipboard.writeText(template.content);
    toast.success("Template copiado!");
  };

  const handleSaveVersion = ({ templateId, content, changeNote }) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const currentMaxVersion = template.versions?.length > 0
      ? Math.max(...template.versions.map(v => v.version))
      : 0;

    const newVersion = {
      id: Date.now().toString(),
      version: currentMaxVersion + 1,
      content,
      change_note: changeNote,
      edited_by: user?.full_name || "Usuário",
      created_at: new Date().toISOString()
    };

    updateMutation.mutate({
      id: templateId,
      data: {
        content,
        versions: [newVersion, ...(template.versions || [])]
      }
    }, {
      onSuccess: () => toast.success("Nova versão salva com sucesso!")
    });
  };

  const handleRestoreVersion = (templateId) => (version) => {
    updateMutation.mutate({
      id: templateId,
      data: {
        content: version.content
      }
    }, {
      onSuccess: () => toast.success(`Conteúdo da versão ${version.version} carregado com sucesso.`)
    });
  };

  const handleDeleteVersion = (templateId) => (versionId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    if (template.versions?.length <= 1) {
      toast.error("Não é possível excluir a única versão do template.");
      return;
    }

    updateMutation.mutate({
      id: templateId,
      data: {
        versions: template.versions.filter(v => v.id !== versionId)
      }
    }, {
      onSuccess: () => toast.success("Versão removida com sucesso!")
    });
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Templates Salvos</CardTitle>
          {templates.length === 0 && !isLoading && (
            <Button variant="outline" size="sm" onClick={loadDefaultTemplates}>
              <DownloadCloud className="w-4 h-4 mr-2" />
              Carregar Padrões
            </Button>
          )}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate(template.id)}
                      title="Excluir template"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
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
          onDelete={handleDeleteVersion(historyTemplate.id)}
          open={!!historyTemplate}
          onOpenChange={(open) => !open && setHistoryTemplate(null)}
        />
      )}
    </div>
  );
}
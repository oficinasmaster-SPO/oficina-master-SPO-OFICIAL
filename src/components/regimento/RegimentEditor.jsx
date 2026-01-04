import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Send } from "lucide-react";
import RegimentSectionEditor from "./RegimentSectionEditor";

const DEFAULT_TEXTS = {
  objective: "Este regimento tem como finalidade disciplinar a relação de trabalho, garantindo um ambiente seguro, produtivo e alinhado à legislação vigente.",
  warning_legal_text: "Esta advertência é aplicada com fundamento no artigo 482 da Consolidação das Leis do Trabalho (CLT), em razão do descumprimento das normas internas da empresa, previamente comunicadas ao colaborador.",
  acknowledgment_text: "Declaro que li, compreendi e estou ciente das normas deste regimento.",
  final_provisions: "Os casos omissos serão avaliados pela direção da empresa. A empresa se reserva o direito de atualizar este regimento, comunicando previamente os colaboradores sobre as alterações."
};

export default function RegimentEditor({ regiment, workshop, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(regiment || {
    workshop_id: workshop?.id,
    version: "1.0",
    effective_date: new Date().toISOString().split('T')[0],
    replaces_previous: true,
    identification: {
      company_name: workshop?.name || "",
      cnpj: workshop?.cnpj || "",
      address: workshop?.endereco_completo || ""
    },
    objective: DEFAULT_TEXTS.objective,
    status: "draft",
    warning_legal_text: DEFAULT_TEXTS.warning_legal_text,
    acknowledgment_text: DEFAULT_TEXTS.acknowledgment_text,
    final_provisions: DEFAULT_TEXTS.final_provisions
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (regiment?.id) {
        return await base44.entities.CompanyRegiment.update(regiment.id, data);
      } else {
        return await base44.entities.CompanyRegiment.create(data);
      }
    },
    onSuccess: () => {
      toast.success(regiment?.id ? "Regimento atualizado!" : "Regimento criado!");
      queryClient.invalidateQueries(['regiments']);
      onSave();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const publishData = {
        ...data,
        status: 'active',
        published_by: user.id,
        published_at: new Date().toISOString()
      };

      if (regiment?.id) {
        return await base44.entities.CompanyRegiment.update(regiment.id, publishData);
      } else {
        return await base44.entities.CompanyRegiment.create(publishData);
      }
    },
    onSuccess: () => {
      toast.success("Regimento publicado e ativado!");
      queryClient.invalidateQueries(['regiments']);
      onSave();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  const handleSaveDraft = () => {
    saveMutation.mutate(formData);
  };

  const handlePublish = () => {
    if (!formData.identification?.company_name || !formData.version) {
      toast.error("Preencha nome da empresa e versão");
      return;
    }
    publishMutation.mutate(formData);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <CardTitle>{regiment?.id ? 'Editar' : 'Novo'} Regimento Interno</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Versão {formData.version}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={saveMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
              <Button onClick={handlePublish} disabled={publishMutation.isPending} className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Publicar e Ativar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="identification" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full bg-white border">
          <TabsTrigger value="identification">Identificação</TabsTrigger>
          <TabsTrigger value="work">Jornada</TabsTrigger>
          <TabsTrigger value="conduct">Conduta</TabsTrigger>
          <TabsTrigger value="safety">Segurança</TabsTrigger>
          <TabsTrigger value="assets">Patrimônio</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinar</TabsTrigger>
          <TabsTrigger value="final">Finais</TabsTrigger>
        </TabsList>

        <TabsContent value="identification">
          <Card>
            <CardHeader>
              <CardTitle>1️⃣ Identificação do Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={formData.identification?.company_name || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      identification: { ...formData.identification, company_name: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>CNPJ *</Label>
                  <Input
                    value={formData.identification?.cnpj || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      identification: { ...formData.identification, cnpj: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div>
                <Label>Endereço Completo *</Label>
                <Input
                  value={formData.identification?.address || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    identification: { ...formData.identification, address: e.target.value }
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Versão do Documento *</Label>
                  <Input
                    value={formData.version || ""}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="Ex: 1.0, 2.0"
                  />
                </div>
                <div>
                  <Label>Data de Vigência *</Label>
                  <Input
                    type="date"
                    value={formData.effective_date || ""}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>2️⃣ Objetivo do Regimento</Label>
                <Textarea
                  rows={4}
                  value={formData.objective || ""}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="bg-blue-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  📌 Deixe claro direitos, deveres, penalidades e proteção à empresa e colaboradores
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work">
          <RegimentSectionEditor
            title="3️⃣ Jornada de Trabalho e Pontualidade"
            description="Base legal: CLT – art. 58 e 74"
            sectionKey="work_schedule"
            formData={formData}
            setFormData={setFormData}
          />
        </TabsContent>

        <TabsContent value="conduct">
          <RegimentSectionEditor
            title="4️⃣ Conduta e Comportamento Profissional"
            description="Base legal: CLT – art. 482 (b, k) | Constituição Federal – art. 225"
            sectionKey="professional_conduct"
            formData={formData}
            setFormData={setFormData}
          />
        </TabsContent>

        <TabsContent value="safety">
          <RegimentSectionEditor
            title="6️⃣ Uniforme, EPI e Segurança"
            description="Base legal: CLT – art. 158 | NR-06 (EPI)"
            sectionKey="uniform_epi_safety"
            formData={formData}
            setFormData={setFormData}
          />
        </TabsContent>

        <TabsContent value="assets">
          <RegimentSectionEditor
            title="7️⃣ Patrimônio, Ferramentas e Estoque"
            description="Base legal: CLT – art. 462, 482 (a e b)"
            sectionKey="assets_tools_inventory"
            formData={formData}
            setFormData={setFormData}
          />
        </TabsContent>

        <TabsContent value="disciplinary">
          <Card>
            <CardHeader>
              <CardTitle>1️⃣1️⃣ Procedimentos Disciplinares</CardTitle>
              <p className="text-sm text-gray-600">Base legal: CLT – art. 482</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <h4 className="font-bold text-orange-900 mb-2">Princípios Obrigatórios:</h4>
                <ul className="text-sm text-orange-900 space-y-1 list-disc list-inside">
                  <li>Gradualidade</li>
                  <li>Proporcionalidade</li>
                  <li>Imediatidade</li>
                  <li>Registro e evidência</li>
                </ul>
              </div>

              <div>
                <Label>1️⃣2️⃣ Texto Legal Padrão para Advertências</Label>
                <Textarea
                  rows={3}
                  value={formData.warning_legal_text || ""}
                  onChange={(e) => setFormData({ ...formData, warning_legal_text: e.target.value })}
                  className="bg-red-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ✔️ Esse texto fortalece juridicamente todas as advertências
                </p>
              </div>

              <div>
                <Label>1️⃣3️⃣ Texto de Ciência e Assinatura</Label>
                <Textarea
                  rows={2}
                  value={formData.acknowledgment_text || ""}
                  onChange={(e) => setFormData({ ...formData, acknowledgment_text: e.target.value })}
                  className="bg-green-50"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardHeader>
              <CardTitle>1️⃣4️⃣ Disposições Finais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Texto de Disposições Finais</Label>
                <Textarea
                  rows={4}
                  value={formData.final_provisions || ""}
                  onChange={(e) => setFormData({ ...formData, final_provisions: e.target.value })}
                />
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-2">🧠 Resumo Executivo:</h4>
                <ul className="text-sm text-green-900 space-y-1">
                  <li>✔️ Protege a empresa</li>
                  <li>✔️ Dá poder ao gestor</li>
                  <li>✔️ Dá clareza ao colaborador</li>
                  <li>✔️ Sustenta advertência, suspensão e justa causa</li>
                  <li>✔️ Funciona como escudo jurídico</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
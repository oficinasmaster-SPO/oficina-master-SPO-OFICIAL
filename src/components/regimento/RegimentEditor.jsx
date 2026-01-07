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
  const [formData, setFormData] = useState(() => {
    // Se está editando regimento existente
    if (regiment) {
      return {
        ...regiment,
        identification: {
          company_name: regiment.identification?.company_name || workshop?.name || "",
          cnpj: regiment.identification?.cnpj || workshop?.cnpj || "",
          address: regiment.identification?.address || workshop?.endereco_completo || ""
        },
        warning_legal_text: regiment.warning_legal_text || DEFAULT_TEXTS.warning_legal_text,
        acknowledgment_text: regiment.acknowledgment_text || DEFAULT_TEXTS.acknowledgment_text,
        final_provisions: regiment.final_provisions || DEFAULT_TEXTS.final_provisions
      };
    }
    
    // Se está criando novo
    return {
      workshop_id: workshop?.id,
      version: "1.0",
      effective_date: new Date().toISOString().split('T')[0],
      replaces_previous: true,
      identification: {
        company_name: workshop?.name || "",
        cnpj: workshop?.cnpj || "",
        address: workshop?.endereco_completo || ""
      },
      sections: [],
      status: "draft",
      warning_legal_text: DEFAULT_TEXTS.warning_legal_text,
      acknowledgment_text: DEFAULT_TEXTS.acknowledgment_text,
      final_provisions: DEFAULT_TEXTS.final_provisions
    };
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
        <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full bg-white border gap-1">
          <TabsTrigger value="identification">Identificação</TabsTrigger>
          <TabsTrigger value="legal">Base Legal</TabsTrigger>
          <TabsTrigger value="duties">Deveres</TabsTrigger>
          <TabsTrigger value="prohibited">Proibições</TabsTrigger>
          <TabsTrigger value="penalties">Penalidades</TabsTrigger>
          <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="equipment">Equipamentos</TabsTrigger>
          <TabsTrigger value="quality">Qualidade</TabsTrigger>
          <TabsTrigger value="exit">Desligamento</TabsTrigger>
          <TabsTrigger value="final">Finais</TabsTrigger>
        </TabsList>

        <TabsContent value="identification">
          <Card>
            <CardHeader>
              <CardTitle>1️⃣ Identificação do Documento</CardTitle>
              <p className="text-xs text-gray-500 mt-1">📌 Dados preenchidos automaticamente do cadastro da oficina</p>
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
                    className="bg-blue-50"
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
                    className="bg-blue-50"
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
                  className="bg-blue-50"
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

        <TabsContent value="legal">
          <Card>
            <CardHeader>
              <CardTitle>⚖️ Base Legal e Poder Diretivo</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 2º, 158, 482 | CF art. 7º | NRs</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "0").map(section => (
                <div key={section.id}>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600 font-semibold">{sub.number}</Label>
                      <Textarea
                        rows={3}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "0");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duties">
          <Card>
            <CardHeader>
              <CardTitle>1️⃣ Deveres do Colaborador</CardTitle>
              <p className="text-sm text-gray-600">Base legal: CLT – art. 158</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "1").map(section => (
                <div key={section.id}>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "1");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prohibited">
          <Card>
            <CardHeader>
              <CardTitle>2️⃣ Condutas Expressamente Proibidas</CardTitle>
              <p className="text-sm text-gray-600">Base legal: CLT – art. 482</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "2").map(section => (
                <div key={section.id}>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "2");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties">
          <Card>
            <CardHeader>
              <CardTitle>5️⃣ Escala de Penalidades</CardTitle>
              <p className="text-sm text-gray-600">Base legal: CLT – art. 482, 474</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-orange-900 mb-2">⚠️ Princípios Obrigatórios:</h4>
                <ul className="text-sm text-orange-900 space-y-1 list-disc list-inside">
                  <li>Gradualidade (não pular etapas)</li>
                  <li>Proporcionalidade (punição compatível com a falta)</li>
                  <li>Imediatidade (punir logo após ciência do fato)</li>
                  <li>Registro e evidência (documentar tudo)</li>
                </ul>
              </div>
              {formData.sections?.filter(s => s.id === "5" || s.id === "6" || s.id === "7" || s.id === "8").map(section => (
                <div key={section.id} className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">{section.number} {section.title}</h4>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === section.id);
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>🚗 Responsabilidade sobre Veículos de Clientes</CardTitle>
              <p className="text-sm text-gray-600">Base legal: Código Civil – Responsabilidade por dano</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "20").map(section => (
                <div key={section.id}>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={3}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "20");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle>🔧 Equipamentos, Peças e Ferramentas</CardTitle>
              <p className="text-sm text-gray-600">Base legal: NR-12 | CLT art. 462</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "21" || s.id === "22" || s.id === "26").map(section => (
                <div key={section.id} className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">{section.number} {section.title}</h4>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={3}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === section.id);
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>📋 Diagnóstico, OS e Qualidade Técnica</CardTitle>
              <p className="text-sm text-gray-600">Procedimentos obrigatórios e retrabalho</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "23" || s.id === "24" || s.id === "25").map(section => (
                <div key={section.id} className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">{section.number} {section.title}</h4>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === section.id);
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit">
          <Card>
            <CardHeader>
              <CardTitle>👋 Desligamento e Entrega de Bens</CardTitle>
              <p className="text-sm text-gray-600">Procedimentos de rescisão e quitação</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.sections?.filter(s => s.id === "27").map(section => (
                <div key={section.id}>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "27");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardHeader>
              <CardTitle>📝 Disposições Finais e Assinatura</CardTitle>
              <p className="text-sm text-gray-600">Declaração de ciência e validade jurídica</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Texto Legal Padrão para Advertências</Label>
                <Textarea
                  rows={4}
                  value={formData.warning_legal_text || ""}
                  onChange={(e) => setFormData({ ...formData, warning_legal_text: e.target.value })}
                  className="bg-red-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ✔️ Fortalece juridicamente todas as advertências
                </p>
              </div>

              <div>
                <Label>Texto de Ciência e Compromisso</Label>
                <Textarea
                  rows={4}
                  value={formData.acknowledgment_text || ""}
                  onChange={(e) => setFormData({ ...formData, acknowledgment_text: e.target.value })}
                  className="bg-green-50"
                />
              </div>

              <div>
                <Label>Disposições Finais</Label>
                <Textarea
                  rows={4}
                  value={formData.final_provisions || ""}
                  onChange={(e) => setFormData({ ...formData, final_provisions: e.target.value })}
                />
              </div>

              {formData.sections?.filter(s => s.id === "28").map(section => (
                <div key={section.id} className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3">{section.number} {section.title}</h4>
                  {section.subsections?.map((sub, index) => (
                    <div key={sub.id} className="mb-3">
                      <Label className="text-xs text-gray-600">{sub.number}</Label>
                      <Textarea
                        rows={2}
                        value={sub.content}
                        onChange={(e) => {
                          const newSections = [...(formData.sections || [])];
                          const sectionIndex = newSections.findIndex(s => s.id === "28");
                          newSections[sectionIndex].subsections[index].content = e.target.value;
                          setFormData({ ...formData, sections: newSections });
                        }}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              ))}

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-2">🧠 Blindagem Jurídica Completa:</h4>
                <ul className="text-sm text-green-900 space-y-1">
                  <li>✔️ Protege a empresa em processos trabalhistas</li>
                  <li>✔️ Dá poder legal ao gestor para aplicar penalidades</li>
                  <li>✔️ Dá clareza ao colaborador sobre deveres e consequências</li>
                  <li>✔️ Sustenta advertência, suspensão e justa causa</li>
                  <li>✔️ Funciona como escudo jurídico em acidentes e danos</li>
                  <li>✔️ Específico para oficinas mecânicas (veículos, equipamentos, retrabalho)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Plus, Trash2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const DEFAULT_TEXTS = {
  objective: "Este regimento tem como finalidade disciplinar a relação de trabalho, garantindo um ambiente seguro, produtivo e alinhado à legislação vigente.",
  warning_legal_text: "Esta advertência é aplicada com fundamento no artigo 482 da Consolidação das Leis do Trabalho (CLT), em razão do descumprimento das normas internas da empresa, previamente comunicadas ao colaborador.",
  acknowledgment_text: "Declaro que li, compreendi e estou ciente das normas deste regimento.",
  final_provisions: "Os casos omissos serão avaliados pela direção da empresa. A empresa se reserva o direito de atualizar este regimento, comunicando previamente os colaboradores sobre as alterações."
};

const SECTION_GROUPS = [
  { value: "identification", label: "Identificação", icon: "📋" },
  { value: "legal", label: "Base Legal", icon: "⚖️", sectionIds: ["0"] },
  { value: "duties", label: "Deveres", icon: "✅", sectionIds: ["1"] },
  { value: "prohibited", label: "Proibições", icon: "🚫", sectionIds: ["2"] },
  { value: "schedule", label: "Jornada", icon: "⏰", sectionIds: ["3"] },
  { value: "absences", label: "Faltas", icon: "📅", sectionIds: ["4"] },
  { value: "penalties", label: "Penalidades", icon: "⚠️", sectionIds: ["5", "6", "7", "8"] },
  { value: "resignation", label: "Demissão", icon: "👋", sectionIds: ["9"] },
  { value: "safety", label: "Segurança", icon: "🦺", sectionIds: ["10"] },
  { value: "resources", label: "Recursos", icon: "💻", sectionIds: ["11"] },
  { value: "confidentiality", label: "Sigilo", icon: "🔒", sectionIds: ["12"] },
  { value: "social", label: "Redes Sociais", icon: "📱", sectionIds: ["13"] },
  { value: "conduct", label: "Conduta", icon: "🤝", sectionIds: ["14"] },
  { value: "dress", label: "Vestimenta", icon: "👔", sectionIds: ["15"] },
  { value: "training", label: "Treinamento", icon: "📚", sectionIds: ["16"] },
  { value: "benefits", label: "Benefícios", icon: "🎁", sectionIds: ["17"] },
  { value: "lgpd", label: "LGPD", icon: "🛡️", sectionIds: ["18"] },
  { value: "contracts", label: "Contratos", icon: "📄", sectionIds: ["19"] },
  { value: "vehicles", label: "Veículos", icon: "🚗", sectionIds: ["20"] },
  { value: "parts", label: "Peças/Danos", icon: "🔧", sectionIds: ["21"] },
  { value: "equipment", label: "Equipamentos", icon: "🏗️", sectionIds: ["22"] },
  { value: "diagnosis", label: "Diagnóstico", icon: "📋", sectionIds: ["23"] },
  { value: "rework", label: "Retrabalho", icon: "🔄", sectionIds: ["24"] },
  { value: "organization", label: "Organização", icon: "🧹", sectionIds: ["25"] },
  { value: "tools", label: "Ferramentas", icon: "🧰", sectionIds: ["26"] },
  { value: "exit", label: "Desligamento", icon: "📦", sectionIds: ["27"] },
  { value: "final", label: "Finais", icon: "📝", sectionIds: ["28"] }
];

export default function RegimentEditor({ regiment, workshop, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => {
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

  const addSubsection = (sectionId) => {
    const newSections = [...(formData.sections || [])];
    const sectionIndex = newSections.findIndex(s => s.id === sectionId);
    
    if (sectionIndex === -1) return;

    const section = newSections[sectionIndex];
    const subsections = section.subsections || [];
    const lastSubNumber = subsections.length > 0 
      ? parseFloat(subsections[subsections.length - 1].number) 
      : parseFloat(section.number);
    
    const newSubNumber = (Math.floor(lastSubNumber) + (subsections.length + 1) * 0.1).toFixed(1);
    
    const newSubsection = {
      id: `${sectionId}.${subsections.length + 1}`,
      number: newSubNumber,
      content: ""
    };

    newSections[sectionIndex].subsections = [...subsections, newSubsection];
    setFormData({ ...formData, sections: newSections });
  };

  const removeSubsection = (sectionId, subIndex) => {
    const newSections = [...(formData.sections || [])];
    const sectionIndex = newSections.findIndex(s => s.id === sectionId);
    
    if (sectionIndex === -1) return;
    
    newSections[sectionIndex].subsections.splice(subIndex, 1);
    setFormData({ ...formData, sections: newSections });
  };

  const renderSectionEditor = (sectionIds, title, description) => {
    const sections = formData.sections?.filter(s => sectionIds.includes(s.id)) || [];
    
    if (sections.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Seção não encontrada no regimento</p>
          <p className="text-xs mt-2">IDs esperados: {sectionIds.join(", ")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-base">{section.number} {section.title}</h4>
                {section.content && (
                  <p className="text-sm text-gray-600 mt-1">{section.content}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSubsection(section.id)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              {section.subsections?.map((sub, index) => (
                <div key={sub.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-600 font-medium">{sub.number}</Label>
                    <Textarea
                      rows={3}
                      value={sub.content}
                      onChange={(e) => {
                        const newSections = [...(formData.sections || [])];
                        const sectionIndex = newSections.findIndex(s => s.id === section.id);
                        newSections[sectionIndex].subsections[index].content = e.target.value;
                        setFormData({ ...formData, sections: newSections });
                      }}
                      className="text-sm mt-1"
                      placeholder="Digite o conteúdo deste item..."
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSubsection(section.id, index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-6"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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
                <CardTitle className="flex items-center gap-2">
                  {regiment?.document_code && (
                    <span className="bg-blue-600 text-white text-xs font-mono px-2 py-1 rounded">{regiment.document_code}</span>
                  )}
                  {regiment?.id ? 'Editar' : 'Novo'} Regimento Interno
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Versão {formData.version} • {formData.sections?.length || 0} seções</p>
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
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-auto bg-white border p-1">
            {SECTION_GROUPS.map(group => (
              <TabsTrigger key={group.value} value={group.value} className="text-xs px-3">
                {group.icon} {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="identification">
          <Card>
            <CardHeader>
              <CardTitle>📋 Identificação do Documento</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Dados preenchidos automaticamente do cadastro da oficina</p>
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
                <Label>Objetivo do Regimento</Label>
                <Textarea
                  rows={4}
                  value={formData.objective || ""}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="bg-blue-50"
                />
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
            <CardContent>
              {renderSectionEditor(["0"], "Base Legal", "Fundamento jurídico do regimento")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duties">
          <Card>
            <CardHeader>
              <CardTitle>✅ Deveres do Colaborador</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 158</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["1"], "Deveres", "Obrigações do colaborador")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prohibited">
          <Card>
            <CardHeader>
              <CardTitle>🚫 Condutas Expressamente Proibidas</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 482</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["2"], "Proibições", "Faltas disciplinares")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>⏰ Jornada de Trabalho e Ponto</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 58, 74</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["3"], "Jornada", "Horários e controle")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absences">
          <Card>
            <CardHeader>
              <CardTitle>📅 Faltas, Atestados e Afastamentos</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 473</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["4"], "Faltas", "Ausências e justificativas")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties">
          <Card>
            <CardHeader>
              <CardTitle>⚠️ Escala de Penalidades</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 482, 474</p>
            </CardHeader>
            <CardContent>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-orange-900 mb-2">Princípios Jurídicos Obrigatórios:</h4>
                <ul className="text-sm text-orange-900 space-y-1 list-disc list-inside">
                  <li>Gradualidade (não pular etapas)</li>
                  <li>Proporcionalidade (punição compatível)</li>
                  <li>Imediatidade (punir logo após ciência)</li>
                  <li>Registro documental (tudo escrito)</li>
                </ul>
              </div>
              {renderSectionEditor(["5", "6", "7", "8"], "Penalidades", "Advertência, suspensão e justa causa")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resignation">
          <Card>
            <CardHeader>
              <CardTitle>👋 Pedido de Demissão pelo Colaborador</CardTitle>
              <p className="text-sm text-gray-600">CLT - Aviso prévio e procedimentos</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["9"], "Pedido de Demissão", "Desligamento voluntário")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle>🦺 Segurança e Saúde no Trabalho</CardTitle>
              <p className="text-sm text-gray-600">NR-01, NR-06, NR-07, NR-12</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["10"], "Segurança", "EPIs e procedimentos de segurança")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>💻 Utilização de Recursos e Patrimônio</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 462 | Código Civil</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["11"], "Recursos", "Equipamentos, internet e instalações")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confidentiality">
          <Card>
            <CardHeader>
              <CardTitle>🔒 Sigilo e Confidencialidade</CardTitle>
              <p className="text-sm text-gray-600">Código Civil | LGPD</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["12"], "Sigilo", "Proteção de informações")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>📱 Celular, Redes Sociais e Imagem</CardTitle>
              <p className="text-sm text-gray-600">Uso de tecnologia e proteção da imagem corporativa</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["13"], "Redes Sociais", "Celular e publicações")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conduct">
          <Card>
            <CardHeader>
              <CardTitle>🤝 Conduta Profissional e Relacionamento</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 482 | Assédio e discriminação</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["14"], "Conduta", "Respeito e ética profissional")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dress">
          <Card>
            <CardHeader>
              <CardTitle>👔 Vestimenta e Apresentação Pessoal</CardTitle>
              <p className="text-sm text-gray-600">Padrão profissional</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["15"], "Vestimenta", "Dress code e higiene")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>📚 Treinamento e Desenvolvimento</CardTitle>
              <p className="text-sm text-gray-600">Capacitações obrigatórias</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["16"], "Treinamento", "Participação em capacitações")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits">
          <Card>
            <CardHeader>
              <CardTitle>🎁 Benefícios e Reconhecimento</CardTitle>
              <p className="text-sm text-gray-600">Vale-alimentação, PLR, comissões</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["17"], "Benefícios", "Programas de incentivo")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lgpd">
          <Card>
            <CardHeader>
              <CardTitle>🛡️ Proteção de Dados (LGPD)</CardTitle>
              <p className="text-sm text-gray-600">Lei 13.709/2018</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["18"], "LGPD", "Privacidade e dados pessoais")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>📄 Alteração de Contratos e Atendimento</CardTitle>
              <p className="text-sm text-gray-600">Procedimentos comerciais</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["19"], "Contratos", "Modificações e atendimento")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>🚗 Responsabilidade sobre Veículos de Clientes</CardTitle>
              <p className="text-sm text-gray-600">Código Civil - Responsabilidade por dano</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["20"], "Veículos", "Custódia, testes e acidentes")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <CardTitle>🔧 Danos a Peças e Componentes</CardTitle>
              <p className="text-sm text-gray-600">Prevenção de prejuízos técnicos</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["21"], "Peças", "Procedimentos e responsabilização")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card>
            <CardHeader>
              <CardTitle>🏗️ Elevadores e Equipamentos Pesados</CardTitle>
              <p className="text-sm text-gray-600">NR-12 - Segurança em máquinas</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["22"], "Equipamentos", "Operação de máquinas de risco")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnosis">
          <Card>
            <CardHeader>
              <CardTitle>📋 Diagnóstico e Ordem de Serviço</CardTitle>
              <p className="text-sm text-gray-600">Procedimentos obrigatórios</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["23"], "Diagnóstico", "OS e aprovação do cliente")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rework">
          <Card>
            <CardHeader>
              <CardTitle>🔄 Retrabalho e Desempenho Técnico</CardTitle>
              <p className="text-sm text-gray-600">Qualidade e responsabilização</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["24"], "Retrabalho", "Falhas operacionais")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>🧹 Organização e Limpeza</CardTitle>
              <p className="text-sm text-gray-600">NR-01 - Ambiente seguro</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["25"], "Organização", "Manutenção do ambiente")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>🧰 Ferramentas Pessoais e da Empresa</CardTitle>
              <p className="text-sm text-gray-600">CLT art. 462 - Patrimônio</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["26"], "Ferramentas", "Responsabilidade e devolução")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exit">
          <Card>
            <CardHeader>
              <CardTitle>📦 Desligamento e Entrega de Bens</CardTitle>
              <p className="text-sm text-gray-600">Procedimentos de rescisão</p>
            </CardHeader>
            <CardContent>
              {renderSectionEditor(["27"], "Desligamento", "Quitação e entrega")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final">
          <Card>
            <CardHeader>
              <CardTitle>📝 Disposições Finais e Assinatura</CardTitle>
              <p className="text-sm text-gray-600">Validade jurídica do documento</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Texto Legal para Advertências</Label>
                <Textarea
                  rows={4}
                  value={formData.warning_legal_text || ""}
                  onChange={(e) => setFormData({ ...formData, warning_legal_text: e.target.value })}
                  className="bg-red-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ✔️ Fortalece juridicamente as advertências
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

              {renderSectionEditor(["28"], "Finais", "Vigência e assinatura")}

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mt-6">
                <h4 className="font-bold text-green-900 mb-2">🧠 Blindagem Jurídica Completa:</h4>
                <ul className="text-sm text-green-900 space-y-1">
                  <li>✔️ Protege a empresa em processos trabalhistas</li>
                  <li>✔️ Dá poder legal ao gestor</li>
                  <li>✔️ Sustenta advertência, suspensão e justa causa</li>
                  <li>✔️ Específico para oficinas mecânicas</li>
                  <li>✔️ Nível corporativo de proteção jurídica</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Plus, Trash2, FileText } from "lucide-react";

const DEFAULT_TEXTS = {
  objective: "Este regimento tem como finalidade disciplinar a relação de trabalho, garantindo um ambiente seguro, produtivo e alinhado à legislação vigente.",
  warning_legal_text: "Esta advertência é aplicada com fundamento no artigo 482 da Consolidação das Leis do Trabalho (CLT), em razão do descumprimento das normas internas da empresa, previamente comunicadas ao colaborador.",
  acknowledgment_text: "Declaro que li, compreendi e estou ciente das normas deste regimento.",
  final_provisions: "Os casos omissos serão avaliados pela direção da empresa. A empresa se reserva o direito de atualizar este regimento, comunicando previamente os colaboradores sobre as alterações."
};

const SECTION_GROUPS = [
  { id: "identification", label: "Identificação", icon: "📋" },
  { id: "legal", label: "Base Legal", icon: "⚖️", sectionIds: ["0"] },
  { id: "duties", label: "Deveres", icon: "✅", sectionIds: ["1"] },
  { id: "prohibited", label: "Proibições", icon: "🚫", sectionIds: ["2"] },
  { id: "schedule", label: "Jornada", icon: "⏰", sectionIds: ["3"] },
  { id: "absences", label: "Faltas", icon: "📅", sectionIds: ["4"] },
  { id: "penalties", label: "Penalidades", icon: "⚠️", sectionIds: ["5", "6", "7", "8"] },
  { id: "resignation", label: "Demissão", icon: "👋", sectionIds: ["9"] },
  { id: "safety", label: "Segurança", icon: "🦺", sectionIds: ["10"] },
  { id: "resources", label: "Recursos", icon: "💻", sectionIds: ["11"] },
  { id: "confidentiality", label: "Sigilo", icon: "🔒", sectionIds: ["12"] },
  { id: "social", label: "Redes Sociais", icon: "📱", sectionIds: ["13"] },
  { id: "conduct", label: "Conduta", icon: "🤝", sectionIds: ["14"] },
  { id: "dress", label: "Vestimenta", icon: "👔", sectionIds: ["15"] },
  { id: "training", label: "Treinamento", icon: "📚", sectionIds: ["16"] },
  { id: "benefits", label: "Benefícios", icon: "🎁", sectionIds: ["17"] },
  { id: "lgpd", label: "LGPD", icon: "🛡️", sectionIds: ["18"] },
  { id: "contracts", label: "Contratos", icon: "📄", sectionIds: ["19"] },
  { id: "vehicles", label: "Veículos", icon: "🚗", sectionIds: ["20"] },
  { id: "parts", label: "Peças/Danos", icon: "🔧", sectionIds: ["21"] },
  { id: "equipment", label: "Equipamentos", icon: "🏗️", sectionIds: ["22"] },
  { id: "diagnosis", label: "Diagnóstico", icon: "📋", sectionIds: ["23"] },
  { id: "rework", label: "Retrabalho", icon: "🔄", sectionIds: ["24"] },
  { id: "organization", label: "Organização", icon: "🧹", sectionIds: ["25"] },
  { id: "tools", label: "Ferramentas", icon: "🧰", sectionIds: ["26"] },
  { id: "exit", label: "Desligamento", icon: "📦", sectionIds: ["27"] },
  { id: "final", label: "Disposições Finais", icon: "📝", sectionIds: ["28"] }
];

export default function RegimentEditor({ regiment, workshop, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("identification");

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
    newSections[sectionIndex].subsections = [...subsections, {
      id: `${sectionId}.${subsections.length + 1}`,
      number: newSubNumber,
      content: ""
    }];
    setFormData({ ...formData, sections: newSections });
  };

  const removeSubsection = (sectionId, subIndex) => {
    const newSections = [...(formData.sections || [])];
    const sectionIndex = newSections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    newSections[sectionIndex].subsections.splice(subIndex, 1);
    setFormData({ ...formData, sections: newSections });
  };

  const renderSectionEditor = (sectionIds) => {
    const sections = formData.sections?.filter(s => sectionIds.includes(s.id)) || [];
    if (sections.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Seção não encontrada no regimento</p>
          <p className="text-xs mt-1">IDs esperados: {sectionIds.join(", ")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {sections.map(section => (
          <div key={section.id} className="border rounded-lg p-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-base text-gray-900">{section.number} {section.title}</h4>
                {section.content && (
                  <p className="text-sm text-gray-500 mt-1">{section.content}</p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => addSubsection(section.id)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </Button>
            </div>
            <div className="space-y-3">
              {section.subsections?.map((sub, index) => (
                <div key={sub.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 font-medium mb-1 block">{sub.number}</Label>
                    <Textarea
                      rows={4}
                      value={sub.content}
                      onChange={(e) => {
                        const newSections = [...(formData.sections || [])];
                        const si = newSections.findIndex(s => s.id === section.id);
                        newSections[si].subsections[index].content = e.target.value;
                        setFormData({ ...formData, sections: newSections });
                      }}
                      className="text-sm min-h-[100px]"
                      placeholder="Digite o conteúdo deste item..."
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSubsection(section.id, index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-6 shrink-0"
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

  const renderIdentification = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-500">Nome da Empresa *</Label>
          <Input
            value={formData.identification?.company_name || ""}
            onChange={(e) => setFormData({ ...formData, identification: { ...formData.identification, company_name: e.target.value } })}
            className="bg-blue-50/50 mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">CNPJ *</Label>
          <Input
            value={formData.identification?.cnpj || ""}
            onChange={(e) => setFormData({ ...formData, identification: { ...formData.identification, cnpj: e.target.value } })}
            className="bg-blue-50/50 mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-500">Endereço Completo *</Label>
        <Input
          value={formData.identification?.address || ""}
          onChange={(e) => setFormData({ ...formData, identification: { ...formData.identification, address: e.target.value } })}
          className="bg-blue-50/50 mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-500">Versão do Documento *</Label>
          <Input value={formData.version || ""} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="mt-1" placeholder="1.0" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Data de Vigência *</Label>
          <Input type="date" value={formData.effective_date || ""} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-500">Objetivo do Regimento</Label>
        <Textarea rows={5} value={formData.objective || ""} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} className="bg-blue-50/50 mt-1 min-h-[110px]" />
      </div>
    </div>
  );

  const renderLegalBase = () => (
    <div className="space-y-5">
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
        <strong className="text-gray-800">Fundamentação:</strong> CLT art. 2º, 158, 482 | CF art. 7º | NRs
      </div>
      {renderSectionEditor(["0"])}
    </div>
  );

  const renderPenalties = () => (
    <div className="space-y-5">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-bold text-orange-900 text-sm mb-2">Princípios Jurídicos Obrigatórios:</h4>
        <ul className="text-sm text-orange-800 space-y-0.5 list-disc list-inside">
          <li>Gradualidade (não pular etapas)</li>
          <li>Proporcionalidade (punição compatível)</li>
          <li>Imediatidade (punir logo após ciência)</li>
          <li>Registro documental (tudo escrito)</li>
        </ul>
      </div>
      {renderSectionEditor(["5", "6", "7", "8"])}
    </div>
  );

  const renderFinal = () => (
    <div className="space-y-5">
      <div>
        <Label className="text-xs text-gray-500">Texto Legal para Advertências</Label>
        <Textarea rows={5} value={formData.warning_legal_text || ""} onChange={(e) => setFormData({ ...formData, warning_legal_text: e.target.value })} className="bg-red-50/50 mt-1 text-sm min-h-[110px]" />
      </div>
      <div>
        <Label className="text-xs text-gray-500">Texto de Ciência e Compromisso</Label>
        <Textarea rows={5} value={formData.acknowledgment_text || ""} onChange={(e) => setFormData({ ...formData, acknowledgment_text: e.target.value })} className="bg-green-50/50 mt-1 text-sm min-h-[110px]" />
      </div>
      <div>
        <Label className="text-xs text-gray-500">Disposições Finais</Label>
        <Textarea rows={5} value={formData.final_provisions || ""} onChange={(e) => setFormData({ ...formData, final_provisions: e.target.value })} className="mt-1 text-sm min-h-[110px]" />
      </div>
      {renderSectionEditor(["28"])}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-bold text-green-900 text-sm mb-2">Blindagem Jurídica Completa:</h4>
        <ul className="text-sm text-green-800 space-y-0.5">
          <li>Protege a empresa em processos trabalhistas</li>
          <li>Dá poder legal ao gestor</li>
          <li>Sustenta advertência, suspensão e justa causa</li>
          <li>Específico para oficinas mecânicas</li>
          <li>Nível corporativo de proteção jurídica</li>
        </ul>
      </div>
    </div>
  );

  const sectionRenderers = {
    identification: renderIdentification,
    legal: renderLegalBase,
    penalties: renderPenalties,
    final: renderFinal,
  };

  const renderContent = () => {
    const group = SECTION_GROUPS.find(g => g.id === activeSection);
    if (!group) return null;

    // Special renderers
    if (sectionRenderers[activeSection]) {
      return sectionRenderers[activeSection]();
    }

    // Default: section-based
    if (group.sectionIds) {
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-lg p-3 text-sm text-gray-600">
            {group.label} — CLT e normas aplicáveis
          </div>
          {renderSectionEditor(group.sectionIds)}
        </div>
      );
    }

    return null;
  };

  const statusLabel = { draft: "Rascunho", active: "Ativo", archived: "Arquivado" };
  const statusColor = { draft: "bg-yellow-100 text-yellow-800", active: "bg-green-100 text-green-800", archived: "bg-gray-200 text-gray-700" };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* HEADER */}
      <header className="shrink-0 border-b bg-white px-6 py-3 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.06)] z-10 relative">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {regiment?.document_code && (
                <span className="bg-blue-600 text-white text-xs font-mono px-2 py-0.5 rounded shrink-0">
                  {regiment.document_code}
                </span>
              )}
              <h2 className="font-semibold text-gray-900 truncate">
                {regiment?.id ? 'Editar' : 'Novo'} Regimento Interno
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed">
                Personalize o Regimento Interno da sua empresa definindo regras, responsabilidades, direitos, deveres e procedimentos aplicáveis aos colaboradores.
              </p>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">
              {formData.identification?.company_name || "Empresa"} — v{formData.version}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saveMutation.isPending} className="gap-1.5">
            <Save className="w-4 h-4" /> Salvar Rascunho
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={publishMutation.isPending} className="bg-green-600 hover:bg-green-700 gap-1.5">
            <Send className="w-4 h-4" /> Publicar e Ativar
          </Button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <aside className="w-[260px] shrink-0 border-r bg-gray-50/80 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Navegação
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 scrollbar-thin">
            {SECTION_GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveSection(group.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-all duration-200 border-l-[3px]
                  ${activeSection === group.id
                    ? 'bg-white shadow-sm border-gray-200 text-gray-900 font-semibold border-l-blue-600'
                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-800 hover:shadow-sm border-l-transparent'
                  }`}
              >
                <span className="text-base shrink-0">{group.icon}</span>
                <span className="truncate">{group.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 px-8 scrollbar-thin">
          <div className="max-w-4xl">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="shrink-0 border-t bg-gray-50/80 px-6 py-2.5 flex items-center justify-between text-xs text-gray-500 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-10 relative">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-green-500' : formData.status === 'draft' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
            Status: <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor[formData.status] || statusColor.draft}`}>{statusLabel[formData.status] || "Rascunho"}</span>
          </span>
          <span>|</span>
          <span>Versão: <strong>{formData.version}</strong></span>
          <span>|</span>
          <span>Seções: <strong>{formData.sections?.length || 0}</strong></span>
        </div>
        <div>
          {formData.updated_date && (
            <span>Última atualização: {new Date(formData.updated_date).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
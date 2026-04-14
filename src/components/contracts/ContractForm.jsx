import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Send, Copy, Save, Eye, FileText, TrendingUp, ArrowRight, ArrowLeft, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import ContractPreview from "./ContractPreview";
import jsPDF from "jspdf";
import { TRAFEGO_PAGO_TEMPLATE } from "./templates/TrafegoPagoTemplate";
import { CONSULTORIA_GOLD_TEMPLATE } from "./templates/ConsultoriaGoldTemplate";

const CONTRACT_TEMPLATES = [
  { id: "trafego-pago", label: "MATRIX - Tráfego Pago", plan: "Todos", content: TRAFEGO_PAGO_TEMPLATE },
  { id: "consultoria-gold", label: "GOLD - Consultoria e Aceleração", plan: "GOLD", content: CONSULTORIA_GOLD_TEMPLATE },
];

export default function ContractForm({ contract, user, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("formulario");
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("trafego-pago");
  const [formData, setFormData] = useState({
    workshop_id: "",
    plan_type: "BRONZE",
    contract_value: 5000,
    monthly_value: 5000,
    setup_fee: 0,
    setup_date: "",
    installment_value: 0,
    installment_due_day: "5",
    contract_duration_months: 12,
    payment_method: "asas",
    contract_template: TRAFEGO_PAGO_TEMPLATE,
    custom_clauses: [],
    internal_notes: ""
  });

  const applyVariablesToText = (text, workshop, form) => {
    if (!text || !workshop) return text;
    return text
      .replace(/\[RAZÃO SOCIAL DA EMPRESA\]/gi, workshop.razao_social || workshop.name || "")
      .replace(/\[CNPJ\]/gi, workshop.cnpj || "___")
      .replace(/\[ENDEREÇO COMPLETO.*?\]/gi, workshop.endereco_completo || `${workshop.endereco_rua || ""} ${workshop.endereco_numero || ""}, ${workshop.endereco_bairro || ""}, ${workshop.city || ""}/${workshop.state || ""}, CEP: ${workshop.cep || ""}`)
      .replace(/\[NOME DO REPRESENTANTE LEGAL\]/gi, workshop.owner_name || "___")
      .replace(/\[CPF\]/gi, "___")
      .replace(/\[E-MAIL\]/gi, workshop.email || "___")
      .replace(/\[TELEFONE\]/gi, workshop.telefone || "___")
      .replace(/{{workshop_name}}/gi, workshop.name || "")
      .replace(/{{razao_social}}/gi, workshop.razao_social || workshop.name || "")
      .replace(/{{cnpj}}/gi, workshop.cnpj || "___")
      .replace(/{{city}}/gi, workshop.city || "___")
      .replace(/{{state}}/gi, workshop.state || "___")
      .replace(/{{endereco_completo}}/gi, workshop.endereco_completo || `${workshop.endereco_rua || ""} ${workshop.endereco_numero || ""}, ${workshop.endereco_bairro || ""}, ${workshop.city || ""}/${workshop.state || ""}, CEP: ${workshop.cep || ""}`)
      .replace(/{{plan_type}}/gi, form.plan_type || "")
      .replace(/{{contract_value}}/gi, `R$ ${form.contract_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}`)
      .replace(/{{duration}}/gi, form.contract_duration_months || 12)
      .replace(/{{setup_fee}}/gi, form.setup_fee ? `R$ ${form.setup_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
      .replace(/{{setup_date}}/gi, form.setup_date ? new Date(form.setup_date).toLocaleDateString('pt-BR') : "___")
      .replace(/{{installment_value}}/gi, form.installment_value ? `R$ ${form.installment_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
      .replace(/{{installment_due_day}}/gi, form.installment_due_day || "___")
      .replace(/{{contract_date}}/gi, new Date().toLocaleDateString('pt-BR'));
  };

  const handleTemplateChange = (templateId) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      
      let newContent = template.content;
      if (selectedWorkshop) {
        newContent = applyVariablesToText(newContent, selectedWorkshop, formData);
      }
      
      setFormData(prev => ({ ...prev, contract_template: newContent }));
      toast.success(`Template "${template.label}" aplicado!`);
    }
  };

  const handleApplyVariablesManual = () => {
    if (!selectedWorkshop) {
      toast.error("Por favor, selecione a oficina cliente primeiro na aba Dados do Contrato.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      contract_template: applyVariablesToText(prev.contract_template, selectedWorkshop, prev)
    }));
    toast.success("Variáveis substituídas com sucesso!");
  };

  // Auto-suggest template when plan changes
  const handlePlanChange = (planValue) => {
    setFormData(prev => ({ ...prev, plan_type: planValue }));
    const matchingTemplate = CONTRACT_TEMPLATES.find(t => t.plan === planValue);
    if (matchingTemplate && matchingTemplate.id !== selectedTemplateId) {
      handleTemplateChange(matchingTemplate.id);
    }
  };

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-list'],
    queryFn: async () => {
      const result = await base44.entities.Workshop.list();
      return Array.isArray(result) ? result : [];
    }
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        workshop_id: contract.workshop_id || "",
        plan_type: contract.plan_type || "BRONZE",
        contract_value: contract.contract_value || 5000,
        monthly_value: contract.monthly_value || 5000,
        setup_fee: contract.setup_fee || 0,
        setup_date: contract.setup_date || "",
        installment_value: contract.installment_value || 0,
        installment_due_day: contract.installment_due_day?.toString() || "5",
        contract_duration_months: contract.contract_duration_months || 12,
        payment_method: contract.payment_method || "asas",
        contract_template: contract.contract_template || TRAFEGO_PAGO_TEMPLATE,
        custom_clauses: contract.custom_clauses || [],
        internal_notes: contract.internal_notes || ""
      });
      
      if (contract.workshop_id && workshops.length > 0) {
        const ws = workshops.find(w => w.id === contract.workshop_id);
        setSelectedWorkshop(ws);
      }
    }
  }, [contract, workshops]);

  useEffect(() => {
    if (formData.workshop_id && workshops.length > 0) {
      const ws = workshops.find(w => w.id === formData.workshop_id);
      setSelectedWorkshop(ws);
    }
  }, [formData.workshop_id, workshops]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const workshop = workshops.find(w => w.id === data.workshop_id);
      
      const contractNumber = `CT${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
      const contractLink = `${window.location.origin}/contrato/${contractNumber}`;

      const res = await base44.functions.invoke('createContrato', {
        ...data,
        tenant_id: data.workshop_id,
        cliente_id: data.workshop_id,
        plano: data.plan_type,
        meses: data.contract_duration_months,
        valor_parcela: data.installment_value,
        taxa_setup: data.setup_fee,
        workshop_name: workshop?.name || "",
        contract_number: contractNumber,
        consultor_id: user.id,
        consultor_nome: user.full_name,
        contract_link: contractLink,
        status: "rascunho",
        completion_percentage: 0,
        timeline: [{
          date: new Date().toISOString(),
          action: "criado",
          description: "Contrato criado",
          user: user.full_name
        }]
      });
      
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato criado com sucesso!");
      onSuccess();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updates = {
        ...data,
        tenant_id: data.workshop_id,
        cliente_id: data.workshop_id,
        plano: data.plan_type,
        meses: data.contract_duration_months,
        valor_parcela: data.installment_value,
        taxa_setup: data.setup_fee,
      };
      
      const res = await base44.functions.invoke('updateContrato', { contract_id: contract.id, updates });
      
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Nova versão do contrato gerada com sucesso!");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (contract) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSendContract = async () => {
    if (contract) {
      await updateMutation.mutateAsync({
        ...formData,
        status: "enviado",
        sent_at: new Date().toISOString(),
        completion_percentage: 20
      });
      toast.success("Contrato enviado!");
    }
  };

  const copyLink = () => {
    const link = contract?.contract_link || `${window.location.origin}/contrato/${contract?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (activeTab === "formulario") {
      if (!formData.workshop_id) {
        toast.error("Selecione uma oficina cliente primeiro.");
        return;
      }
      setActiveTab("template");
    } else if (activeTab === "template") {
      setActiveTab("preview");
    }
  };

  const handlePrevStep = () => {
    if (activeTab === "preview") setActiveTab("template");
    else if (activeTab === "template") setActiveTab("formulario");
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const margin = 30; // Margem ABNT: Esquerda 3cm, Superior 3cm, Direita 2cm, Inferior 2cm
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin - 20;

    doc.setFont("times", "normal");
    doc.setFontSize(12);

    let yPosition = 30;

    doc.setFont("times", "bold");
    doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    doc.setFont("times", "normal");
    const previewElement = document.getElementById("contract-preview-content");
    const textContent = previewElement ? previewElement.innerText : formData.contract_template;

    const lines = doc.splitTextToSize(textContent, maxLineWidth);
    
    lines.forEach((line) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(line, margin, yPosition, { align: "justify", maxWidth: maxLineWidth });
      yPosition += 7; // Espaçamento 1.5 padrão ABNT
    });

    doc.save(`Contrato_${selectedWorkshop?.name || "Oficina"}.pdf`);
    toast.success("PDF baixado com sucesso!");
  };

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleOpenEmailModal = () => {
    setEmailToSend(selectedWorkshop?.email || "");
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailToSend) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setIsSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: emailToSend,
        subject: `Contrato de Prestação de Serviços - ${selectedWorkshop?.name}`,
        body: `Olá,\n\nSegue o link para visualização e assinatura do seu contrato: ${contract?.contract_link || `${window.location.origin}/contrato/${contract?.id || 'novo'}`}\n\nAtenciosamente,\nEquipe Oficinas Master`
      });
      toast.success("Contrato enviado por e-mail com sucesso!");
      setIsEmailModalOpen(false);
    } catch (error) {
      toast.error("Erro ao enviar e-mail.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const useContratoFinanceiro = (form) => {
    return React.useMemo(() => {
      const meses = parseInt(form.contract_duration_months) || 0;
      const parcela = parseFloat(form.installment_value) || 0;
      const setup = parseFloat(form.setup_fee) || 0;

      const mrr = parcela;
      const totalContrato = (parcela * meses) + setup;
      const ltv = mrr * meses;

      return { mrr, totalContrato, ltv };
    }, [form.contract_duration_months, form.installment_value, form.setup_fee]);
  };

  const financeiro = useContratoFinanceiro(formData);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contract ? 'Editar Contrato' : 'Novo Contrato - Tráfego Pago'}</CardTitle>
        <p className="text-sm text-gray-600">
          Os dados da oficina serão preenchidos automaticamente no contrato
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-between items-center bg-gray-50 p-2 rounded-lg border">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md ${activeTab === 'formulario' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === 'formulario' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
            Dados do Contrato
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md ${activeTab === 'template' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
            Template
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-md ${activeTab === 'preview' ? 'bg-white shadow text-blue-600 font-semibold' : 'text-gray-500'}`}>
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
            Pré-visualização
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsContent value="formulario" forceMount className={activeTab === 'formulario' ? 'block' : 'hidden'}>
            <form onSubmit={handleNextStep} className="space-y-6">
              
              {/* 2. Informações do Contrato */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Informações do Contrato</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Oficina Cliente *</label>
                    <Select value={formData.workshop_id} onValueChange={(value) => setFormData({ ...formData, workshop_id: value })} required>
                      <SelectTrigger className="border-gray-200 rounded-xl focus:ring-red-500">
                        <SelectValue placeholder="Selecionar oficina..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workshops.map((workshop) => (
                          <SelectItem key={workshop.id} value={workshop.id}>
                            {workshop.name} - {workshop.city}/{workshop.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Plano *</label>
                    <Select value={formData.plan_type} onValueChange={handlePlanChange}>
                      <SelectTrigger className="border-gray-200 rounded-xl focus:ring-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="START">START</SelectItem>
                        <SelectItem value="BRONZE">BRONZE</SelectItem>
                        <SelectItem value="PRATA">PRATA</SelectItem>
                        <SelectItem value="GOLD">GOLD</SelectItem>
                        <SelectItem value="IOM">IOM</SelectItem>
                        <SelectItem value="MILLIONS">MILLIONS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Duração (meses)</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.contract_duration_months}
                      onChange={(e) => {
                        const m = parseInt(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          contract_duration_months: m,
                          contract_value: ((formData.installment_value || 0) * m) + (formData.setup_fee || 0)
                        });
                      }}
                      className="border-gray-200 rounded-xl focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {selectedWorkshop && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Dados da Oficina Selecionada:</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Razão Social:</p>
                      <p className="font-medium">{selectedWorkshop.razao_social || selectedWorkshop.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">CNPJ:</p>
                      <p className="font-medium">{selectedWorkshop.cnpj || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Cidade/Estado:</p>
                      <p className="font-medium">{selectedWorkshop.city}/{selectedWorkshop.state}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Endereço:</p>
                      <p className="font-medium">{selectedWorkshop.endereco_completo || "Não informado"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-3">
                    ✓ Estes dados serão inseridos automaticamente no contrato
                  </p>
                </div>
              )}

              {/* 3. BLOCO FINANCEIRO (DESTAQUE VISUAL) */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-medium text-red-900 border-b border-red-200 pb-2">Financeiro</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Valor da Parcela</label>
                    <InputMoeda
                      value={formData.installment_value}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          installment_value: val, 
                          contract_value: (val * (formData.contract_duration_months || 0)) + (formData.setup_fee || 0) 
                        });
                      }}
                      className="border-red-200 rounded-xl focus:ring-red-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Taxa Setup</label>
                    <InputMoeda
                      value={formData.setup_fee}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          setup_fee: val, 
                          contract_value: ((formData.installment_value || 0) * (formData.contract_duration_months || 0)) + val 
                        });
                      }}
                      className="border-red-200 rounded-xl focus:ring-red-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Valor do Contrato (Total)</label>
                    <InputMoeda
                      value={formData.contract_value}
                      onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                      className="border-red-200 rounded-xl focus:ring-red-500 font-semibold text-gray-700"
                      placeholder={formatMoney(financeiro.totalContrato)}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Configuração de Pagamento */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Configuração de Pagamento</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Método de Pagamento</label>
                    <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                      <SelectTrigger className="border-gray-200 rounded-xl focus:ring-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asas">Asas</SelectItem>
                        <SelectItem value="prefi">Prefi</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Dia de Vencimento</label>
                    <Select value={formData.installment_due_day?.toString() || "5"} onValueChange={(value) => setFormData({ ...formData, installment_due_day: value })}>
                      <SelectTrigger className="border-gray-200 rounded-xl focus:ring-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Dia 5</SelectItem>
                        <SelectItem value="10">Dia 10</SelectItem>
                        <SelectItem value="15">Dia 15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">Data da Taxa Setup</label>
                    <Input
                      type="date"
                      value={formData.setup_date}
                      onChange={(e) => setFormData({ ...formData, setup_date: e.target.value })}
                      className="border-gray-200 rounded-xl focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Card de Inteligência Financeira (OBRIGATÓRIO) */}
              <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 opacity-10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2"></div>
                
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  Inteligência Financeira
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 relative z-10">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">MRR (Receita Recorrente)</p>
                    <p className="text-2xl font-bold">{formatMoney(financeiro.mrr)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Valor Total do Contrato</p>
                    <p className="text-2xl font-bold">{formatMoney(financeiro.totalContrato)}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg border border-green-500/30 relative">
                    <div className="absolute top-0 right-0 p-1">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </div>
                    <p className="text-green-400 text-sm mb-1 font-medium">LTV Projetado</p>
                    <p className="text-2xl font-bold text-green-400">{formatMoney(financeiro.ltv)}</p>
                  </div>
                </div>

                <div className="bg-gray-800/80 rounded-lg p-3 text-sm text-gray-300 border border-gray-700/50 relative z-10">
                  💡 <span className="font-medium text-white">Insight Automático:</span> Esse contrato representa <span className="font-bold text-green-400">{formatMoney(financeiro.totalContrato)}</span> em receita total para a empresa ao longo de {formData.contract_duration_months || 0} meses.
                </div>
              </div>

              {/* 5. Observações */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 mb-1 block">Observações Internas</label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  placeholder="Anotações internas sobre este contrato..."
                  className="min-h-[100px] border-gray-200 rounded-xl focus:ring-red-500"
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                {onCancel ? (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                ) : <div></div>}
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Próximo Passo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="template" forceMount className={activeTab === 'template' ? 'block' : 'hidden'}>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-blue-900 font-semibold mb-1 block">Selecionar Template</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Escolha um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label} {t.plan !== "Todos" ? `(Plano ${t.plan})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-blue-700">
                    Ao selecionar um plano (ex: GOLD), o template correspondente é aplicado automaticamente.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex justify-between items-center flex-wrap gap-4">
                <p className="text-sm text-yellow-800">
                  Variáveis disponíveis: {"{{razao_social}}"}, {"{{cnpj}}"}, {"{{city}}"}, {"{{state}}"}, {"{{endereco_completo}}"}, {"{{contract_value}}"}, {"{{duration}}"}, {"{{installment_value}}"}, {"{{installment_due_day}}"}, {"{{setup_fee}}"}, {"{{setup_date}}"}, {"{{contract_date}}"}, etc.
                </p>
                <Button type="button" onClick={handleApplyVariablesManual} variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  Substituir Variáveis Agora
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Template do Contrato</Label>
                <Textarea
                  value={formData.contract_template}
                  onChange={(e) => setFormData({ ...formData, contract_template: e.target.value })}
                  placeholder="Cole ou edite o template do contrato..."
                  className="min-h-[500px] font-mono text-xs"
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-3">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={handlePrevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                  </Button>
                </div>
                <Button type="button" onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Pré-visualizar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" forceMount className={activeTab === 'preview' ? 'block' : 'hidden'}>
            {selectedWorkshop && (
              <div id="contract-preview-container">
                <ContractPreview 
                  contract={{ ...formData, ...contract }} 
                  workshop={selectedWorkshop} 
                />
              </div>
            )}
            
            <div className="flex justify-between items-center pt-6 mt-6 border-t flex-wrap gap-4">
              <div className="flex gap-3">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Template
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={downloadPDF} className="border-gray-300">
                  <Download className="w-4 h-4 mr-2" /> Download PDF (ABNT)
                </Button>
                
                <Button type="button" variant="outline" onClick={handleOpenEmailModal} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Mail className="w-4 h-4 mr-2" /> Enviar por E-mail
                </Button>

                {contract && contract.contract_link && (
                  <Button type="button" variant="outline" onClick={copyLink}>
                    <Copy className="w-4 h-4 mr-2" /> Copiar Link
                  </Button>
                )}

                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {contract ? 'Atualizar Contrato' : 'Salvar Contrato'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Contrato por E-mail</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>E-mail do Destinatário</Label>
              <Input 
                type="email" 
                value={emailToSend} 
                onChange={(e) => setEmailToSend(e.target.value)} 
                placeholder="exemplo@cliente.com"
              />
              <p className="text-xs text-gray-500">Puxamos o e-mail do cadastro automaticamente, mas você pode alterar caso necessário.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
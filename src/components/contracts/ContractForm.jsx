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
import { Loader2, Send, Copy, Save, Eye, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import ContractPreview from "./ContractPreview";
import { TRAFEGO_PAGO_TEMPLATE } from "./templates/TrafegoPagoTemplate";
import { CONSULTORIA_GOLD_TEMPLATE } from "./templates/ConsultoriaGoldTemplate";

const CONTRACT_TEMPLATES = [
  { id: "trafego-pago", label: "MATRIX - Tráfego Pago", plan: "Todos", content: TRAFEGO_PAGO_TEMPLATE },
  { id: "consultoria-gold", label: "GOLD - Consultoria e Aceleração", plan: "GOLD", content: CONSULTORIA_GOLD_TEMPLATE },
];

export default function ContractForm({ contract, user, onSuccess }) {
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

  const handleTemplateChange = (templateId) => {
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setFormData(prev => ({ ...prev, contract_template: template.content }));
      toast.success(`Template "${template.label}" aplicado!`);
    }
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

      return await base44.entities.Contract.create({
        ...data,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato criado com sucesso!");
      onSuccess();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Contract.update(contract.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success("Contrato atualizado!");
      onSuccess();
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="formulario">
              <FileText className="w-4 h-4 mr-2" />
              Dados do Contrato
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!formData.workshop_id}>
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualização
            </TabsTrigger>
            <TabsTrigger value="template">
              <FileText className="w-4 h-4 mr-2" />
              Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formulario">
            <form onSubmit={handleSubmit} className="space-y-6">
              
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

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {contract ? 'Atualizar Contrato' : 'Criar Contrato'}
                </Button>

                {contract && contract.status === 'rascunho' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendContract}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar para Cliente
                  </Button>
                )}

                {contract && contract.contract_link && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preview">
            {selectedWorkshop && (
              <ContractPreview 
                contract={{ ...formData, ...contract }} 
                workshop={selectedWorkshop} 
              />
            )}
          </TabsContent>

          <TabsContent value="template">
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  Variáveis disponíveis: {"{{razao_social}}"}, {"{{cnpj}}"}, {"{{city}}"}, {"{{state}}"}, {"{{contract_value}}"}, {"{{duration}}"}, {"{{installment_value}}"}, {"{{installment_due_day}}"}, {"{{setup_fee}}"}, {"{{setup_date}}"}, {"{{contract_date}}"}, etc.
                </p>
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
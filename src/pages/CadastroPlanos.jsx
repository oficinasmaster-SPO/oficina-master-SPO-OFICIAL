import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Sparkles, Target, Crown, Rocket, Zap } from "lucide-react";
import { toast } from "sonner";

export default function CadastroPlanos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Plano, 2: Dados
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [formData, setFormData] = useState({
    // Dados da oficina
    name: "",
    cnpj: "",
    city: "",
    state: "",
    segment: "",
    // Dados de login
    email: "",
    password: "",
    full_name: ""
  });

  const plans = [
    {
      id: "FREE",
      name: "Grátis",
      price: "R$ 0",
      period: "/mês",
      description: "Perfeito para conhecer a ferramenta",
      features: [
        "Avaliação completa da empresa",
        "Diagnóstico de maturidade",
        "Relatório básico",
        "Acesso por 30 dias"
      ],
      icon: Sparkles,
      color: "bg-gray-100",
      borderColor: "border-gray-300",
      textColor: "text-gray-900",
      popular: false
    },
    {
      id: "BRONZE",
      name: "Bronze",
      price: "R$ 197",
      period: "/mês",
      description: "Ideal para oficinas em crescimento",
      features: [
        "Tudo do plano Grátis",
        "Gestão de colaboradores",
        "Plano de ação personalizado",
        "Suporte por e-mail"
      ],
      icon: Target,
      color: "bg-orange-50",
      borderColor: "border-orange-300",
      textColor: "text-orange-900",
      popular: false
    },
    {
      id: "PRATA",
      name: "Prata",
      price: "R$ 397",
      period: "/mês",
      description: "Para oficinas que querem mais",
      features: [
        "Tudo do Bronze",
        "Diagnósticos avançados",
        "Gestão de metas e KPIs",
        "Análise de rentabilidade",
        "Suporte prioritário"
      ],
      icon: Zap,
      color: "bg-slate-50",
      borderColor: "border-slate-300",
      textColor: "text-slate-900",
      popular: true
    },
    {
      id: "GOLD",
      name: "Gold",
      price: "R$ 697",
      period: "/mês",
      description: "Acesso completo à ferramenta",
      features: [
        "Tudo do Prata",
        "Cultura organizacional",
        "Gamificação e rankings",
        "IA para insights",
        "Acesso ilimitado",
        "Suporte premium"
      ],
      icon: Crown,
      color: "bg-yellow-50",
      borderColor: "border-yellow-400",
      textColor: "text-yellow-900",
      popular: false
    },
    {
      id: "IOM",
      name: "IOM",
      price: "R$ 1.497",
      period: "/mês",
      description: "Imersão Oficinas Master",
      features: [
        "Tudo do Gold",
        "Consultoria especializada",
        "Imersão presencial",
        "Mentoria exclusiva",
        "Networking com oficinas TOP",
        "Certificação"
      ],
      icon: Rocket,
      color: "bg-purple-50",
      borderColor: "border-purple-400",
      textColor: "text-purple-900",
      popular: false
    },
    {
      id: "MILLIONS",
      name: "Millions",
      price: "R$ 2.997",
      period: "/mês",
      description: "Acesso total e VIP",
      features: [
        "Tudo do IOM",
        "Consultoria VIP ilimitada",
        "Eventos exclusivos",
        "Acesso à rede Millions",
        "Suporte dedicado 24/7",
        "Todas as funcionalidades futuras"
      ],
      icon: Crown,
      color: "bg-gradient-to-br from-purple-100 to-pink-100",
      borderColor: "border-purple-500",
      textColor: "text-purple-900",
      popular: false
    }
  ];

  const segmentOptions = [
    { value: "mecanica_leve", label: "Mecânica Auto" },
    { value: "mecanica_pesada", label: "Truck Pesado" },
    { value: "motos", label: "Oficina Motos" },
    { value: "centro_automotivo", label: "Centro Automotivo" },
    { value: "premium", label: "Oficina Premium Car" },
    { value: "outro", label: "Outro" }
  ];

  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.cnpj || !formData.city || !formData.state || !formData.segment) {
      toast.error("Preencha todos os dados da oficina");
      return;
    }

    if (!formData.email || !formData.password) {
      toast.error("Preencha e-mail e senha para criar sua conta");
      return;
    }

    setLoading(true);

    try {
      // Registrar usuário no Base44
      // Nota: Base44 usa base44.auth para registro, mas não tem método direto de signup na SDK
      // O registro será feito através do sistema padrão do Base44
      
      // Por enquanto, vamos simular o fluxo de registro
      // Em produção, você precisará usar o sistema de registro do Base44
      
      // Criar a oficina
      const workshopData = {
        name: formData.name,
        cnpj: formData.cnpj,
        city: formData.city,
        state: formData.state,
        segment: formData.segment,
        planoAtual: selectedPlan,
        owner_id: "TEMP_USER_ID" // Será substituído pelo ID real do usuário após registro
      };

      toast.info("Por favor, complete o registro no Base44 primeiro");
      
      // Redirecionar para login do Base44 para criar a conta
      base44.auth.redirectToLogin(window.location.href);

      // Após o registro, o usuário será redirecionado de volta
      // e aí sim poderemos criar a oficina vinculada ao user.id real

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-blue-600">Oficinas Master</div>
            </div>
            <Button variant="outline" onClick={() => base44.auth.redirectToLogin()}>
              Já tenho conta
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {step === 1 && (
          <div>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Escolha seu Plano
              </h1>
              <p className="text-xl text-gray-600">
                Comece grátis e evolua conforme sua oficina cresce
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <Card
                    key={plan.id}
                    className={`relative ${plan.color} border-2 ${plan.borderColor} hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                          Mais Popular
                        </span>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4">
                        <div className={`p-4 rounded-full ${plan.color} border-2 ${plan.borderColor}`}>
                          <Icon className={`w-8 h-8 ${plan.textColor}`} />
                        </div>
                      </div>
                      <CardTitle className={`text-2xl ${plan.textColor}`}>
                        {plan.name}
                      </CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-600">{plan.period}</span>
                      </div>
                      <CardDescription className="mt-2 text-gray-700">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button 
                        className={`w-full ${plan.id === 'FREE' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        {plan.id === 'FREE' ? 'Começar Grátis' : 'Assinar Agora'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complete seu Cadastro
              </h1>
              <p className="text-gray-600">
                Plano selecionado: <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>
              </p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Dados da Oficina e Acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Dados da Oficina */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                      Informações da Oficina
                    </h3>
                    
                    <div>
                      <Label>Nome Fantasia *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Oficina São José"
                        required
                      />
                    </div>

                    <div>
                      <Label>CNPJ *</Label>
                      <Input
                        value={formData.cnpj}
                        onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cidade *</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          placeholder="Ex: São Paulo"
                          required
                        />
                      </div>
                      <div>
                        <Label>Estado *</Label>
                        <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {estados.map(estado => (
                              <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Segmento Principal *</Label>
                      <Select value={formData.segment} onValueChange={(v) => setFormData({...formData, segment: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                        <SelectContent>
                          {segmentOptions.map(seg => (
                            <SelectItem key={seg.value} value={seg.value}>{seg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dados de Login */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                      Criar sua Conta de Acesso
                    </h3>
                    
                    <div>
                      <Label>Nome Completo</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div>
                      <Label>E-mail *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="seu@email.com"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este será seu login para acessar a plataforma
                      </p>
                    </div>

                    <div>
                      <Label>Senha *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        selectedPlan === 'FREE' ? 'Criar Conta Grátis' : 'Prosseguir para Pagamento'
                      )}
                    </Button>
                  </div>

                  {selectedPlan !== 'FREE' && (
                    <p className="text-sm text-gray-600 text-center">
                      Após criar sua conta, você será direcionado para o pagamento seguro
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, Sparkles, Target, Crown, Rocket, Zap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CadastroPlanos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1); // 1: Plano, 2: Dados
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentWorkshop, setCurrentWorkshop] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      
      if (!authenticated) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      try {
        const currentUser = await base44.auth.me();
        const workshops = await base44.entities.Workshop.list();
        const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
        
        if (userWorkshop) {
          setCurrentWorkshop(userWorkshop);
          setSelectedPlan(userWorkshop.planoAtual);
        }
      } catch (error) {
        console.error("Erro ao verificar plano:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

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
    // Se já tem oficina, apenas atualiza o plano
    if (currentWorkshop) {
      handleUpdatePlan(planId);
    } else {
      setStep(2);
    }
  };

  const handleUpdatePlan = async (planId) => {
    setLoading(true);
    try {
      await base44.entities.Workshop.update(currentWorkshop.id, {
        planoAtual: planId,
        dataAssinatura: new Date().toISOString()
      });
      toast.success("Plano atualizado com sucesso!");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar plano");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.city || !formData.state || !formData.segment) {
      toast.error("Preencha todos os dados da oficina");
      return;
    }

    setLoading(true);

    try {
      const currentUser = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      let userWorkshop = workshops.find(w => w.owner_id === currentUser.id);

      const workshopData = {
        name: formData.name,
        cnpj: formData.cnpj,
        city: formData.city,
        state: formData.state,
        segment: formData.segment,
        planoAtual: selectedPlan,
        dataAssinatura: new Date().toISOString(),
        owner_id: currentUser.id
      };

      if (userWorkshop) {
        // Atualiza oficina existente
        await base44.entities.Workshop.update(userWorkshop.id, workshopData);
        toast.success("Plano escolhido com sucesso!");
      } else {
        // Cria nova oficina
        await base44.entities.Workshop.create(workshopData);
        toast.success("Oficina cadastrada e plano escolhido!");
      }

      // Redireciona para a Home do app
      navigate(createPageUrl("Home"));

    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar cadastro");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {step === 1 && (
          <div>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {currentWorkshop?.planoAtual ? 'Alterar Plano' : 'Escolha seu Plano'}
              </h1>
              <p className="text-xl text-gray-600">
                {currentWorkshop?.planoAtual 
                  ? `Seu plano atual: ${plans.find(p => p.id === currentWorkshop.planoAtual)?.name || currentWorkshop.planoAtual}`
                  : 'Comece grátis e evolua conforme sua oficina cresce'
                }
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
                        disabled={loading || (currentWorkshop?.planoAtual === plan.id)}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : currentWorkshop?.planoAtual === plan.id ? (
                          'Plano Atual'
                        ) : plan.id === 'FREE' ? (
                          'Começar Grátis'
                        ) : (
                          'Selecionar Plano'
                        )}
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
                      <Label>CNPJ (opcional)</Label>
                      <Input
                        value={formData.cnpj}
                        onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
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

                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      📋 Próximo Passo
                    </h3>
                    <p className="text-sm text-blue-800">
                      Após confirmar esses dados, você será direcionado para criar sua conta de acesso de forma segura no Base44.
                    </p>
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
                        'Continuar para Registro'
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
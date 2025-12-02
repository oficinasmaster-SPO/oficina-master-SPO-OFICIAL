import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Save, ArrowLeft, ArrowRight, CheckCircle, FileText, Mic, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function CriarDescricaoCargo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  
  const [formData, setFormData] = useState({
    job_title: "",
    previous_experience: [],
    education: [],
    knowledge: [],
    clients: [],
    main_activities: [],
    main_responsibilities: "",
    co_responsibilities: "",
    personal_attributes: [],
    inherent_risks: "",
    equipment_tools: [],
    managed_information: "",
    working_conditions: "",
    physical_effort: "",
    mental_effort: "",
    visual_effort: "",
    financial_transactions: "",
    third_party_safety: "",
    contact_responsibilities: "",
    indicators: [],
    trainings: []
  });

  const [tempInput, setTempInput] = useState({ item: "", required: false, desired: false });
  const [isListening, setIsListening] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Função de Microfone
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Parar reconhecimento (a API para automaticamente, mas forçamos o estado)
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Ouvindo... Fale agora.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const field = currentQuestion.id;
      
      if (currentQuestion.type === "textarea" || currentQuestion.type === "text") {
        setFormData(prev => ({
          ...prev,
          [field]: (prev[field] ? prev[field] + " " : "") + transcript
        }));
      } else {
        setTempInput(prev => ({ ...prev, item: transcript }));
      }
    };

    recognition.start();
  };

  // Função de IA
  const generateWithAI = async () => {
    if (!formData.job_title) {
      toast.error("Preencha o nome do cargo primeiro para usar a IA.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const prompt = `
        Atue como um especialista em RH sênior.
        Gere um conteúdo profissional para o campo "${currentQuestion.title}" 
        de uma Descrição de Cargo para a função: "${formData.job_title}".
        
        Contexto: O cargo é para uma oficina mecânica/centro automotivo.
        Seja direto, use tópicos se apropriado para o campo, e mantenha um tom formal e claro.
        Siga o padrão de mercado.
        Retorne APENAS o texto sugerido, sem introduções.
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      const suggestion = response;
      
      if (currentQuestion.type === "textarea" || currentQuestion.type === "text") {
        setFormData(prev => ({
          ...prev,
          [field]: suggestion
        }));
      } else {
        // Tentar separar por quebras de linha se for lista
        const items = suggestion.split('\n').filter(i => i.trim().length > 0).map(i => i.replace(/^-\s*/, '').trim());
        // Adicionar o primeiro item ao input temporário
        if (items.length > 0) {
           setTempInput(prev => ({ ...prev, item: items[0] }));
           toast.success("Sugestão gerada! Adicione o item ou edite.");
           // Nota: Para listas completas seria complexo adicionar tudo de uma vez na estrutura atual, 
           // então colocamos o primeiro no input para o usuário validar.
        }
      }
      toast.success("Sugestão gerada com IA!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const questions = [
    { id: "job_title", title: "1. Nome do Cargo", type: "text", hasRequiredDesired: false },
    { id: "previous_experience", title: "2. Experiência Prévia", type: "list-checkbox", hasRequiredDesired: true },
    { id: "education", title: "3. Formação Escolar", type: "list-checkbox", hasRequiredDesired: true },
    { id: "knowledge", title: "4. Conhecimentos", type: "list-checkbox", hasRequiredDesired: true },
    { id: "clients", title: "5. Clientes", type: "list-internal-external", hasRequiredDesired: false },
    { id: "main_activities", title: "6. Principais Atividades do Cargo", type: "list-simple", hasRequiredDesired: false },
    { id: "main_responsibilities", title: "7. Principais Responsabilidades", type: "textarea", hasRequiredDesired: false },
    { id: "co_responsibilities", title: "8. Co-Responsabilidades", type: "textarea", hasRequiredDesired: false },
    { id: "personal_attributes", title: "9. Atributos Pessoais", type: "list-checkbox", hasRequiredDesired: true },
    { id: "inherent_risks", title: "10. Riscos Inerentes ao Cargo", type: "textarea", hasRequiredDesired: false },
    { id: "equipment_tools", title: "11. Máquinas, Equipamentos e Ferramentas", type: "list-simple", hasRequiredDesired: false },
    { id: "managed_information", title: "12. Informações Administradas pelo Cargo", type: "textarea", hasRequiredDesired: false },
    { id: "working_conditions", title: "13. Condições de Trabalho", type: "textarea", hasRequiredDesired: false },
    { id: "physical_effort", title: "14. Esforço Físico", type: "textarea", hasRequiredDesired: false },
    { id: "mental_effort", title: "15. Esforço Mental", type: "textarea", hasRequiredDesired: false },
    { id: "visual_effort", title: "16. Esforço Visual", type: "textarea", hasRequiredDesired: false },
    { id: "financial_transactions", title: "17. Volume de Transações Financeiras", type: "textarea", hasRequiredDesired: false },
    { id: "third_party_safety", title: "18. Responsabilidades pela Segurança de Terceiros", type: "textarea", hasRequiredDesired: false },
    { id: "contact_responsibilities", title: "19. Responsabilidades por Contatos", type: "textarea", hasRequiredDesired: false },
    { id: "indicators", title: "20. Indicadores", type: "list-checkbox", hasRequiredDesired: true },
    { id: "trainings", title: "21. Treinamentos", type: "list-simple", hasRequiredDesired: false }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      
      if (userWorkshop) {
        setWorkshop(userWorkshop);
      }
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("CriarDescricaoCargo"));
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const addItem = () => {
    if (!tempInput.item.trim()) return;

    const field = currentQuestion.id;
    
    if (currentQuestion.type === "list-checkbox") {
      setFormData({
        ...formData,
        [field]: [...formData[field], { item: tempInput.item, required: tempInput.required, desired: tempInput.desired }]
      });
    } else if (currentQuestion.type === "list-internal-external") {
      setFormData({
        ...formData,
        [field]: [...formData[field], { item: tempInput.item, internal: tempInput.required, external: tempInput.desired }]
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...formData[field], tempInput.item]
      });
    }
    
    setTempInput({ item: "", required: false, desired: false });
  };

  const removeItem = (index) => {
    const field = currentQuestion.id;
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
      setTempInput({ item: "", required: false, desired: false });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTempInput({ item: "", required: false, desired: false });
    }
  };

  const handleSubmit = async () => {
    if (!formData.job_title) {
      toast.error("Nome do cargo é obrigatório");
      return;
    }

    setSubmitting(true);

    try {
      await base44.entities.JobDescription.create({
        ...formData,
        workshop_id: workshop?.id || null
      });
      toast.success("Descrição de cargo salva!");
      navigate(createPageUrl("DescricoesCargo"));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Formulário de Descrição de Cargos
          </h1>
          <p className="text-gray-600">Oficinas Master - Preencha passo a passo</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Pergunta {currentStep + 1} de {questions.length}
            </span>
            <span className="text-sm font-semibold text-purple-600">
              {progress.toFixed(0)}% completo
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">{currentQuestion.title}</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleListening}
                className={`${isListening ? "bg-red-100 border-red-500 text-red-600" : ""}`}
                title="Falar para preencher"
              >
                <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateWithAI}
                disabled={isGeneratingAI}
                className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                title="Melhorar com IA"
              >
                {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">IA</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 min-h-[400px]">
            {currentQuestion.type === "text" && (
              <div>
                <Label>Nome do Cargo *</Label>
                <Input
                  value={formData[currentQuestion.id]}
                  onChange={(e) => setFormData({...formData, [currentQuestion.id]: e.target.value})}
                  placeholder="Ex: Mecânico Líder"
                  className="mt-2"
                />
              </div>
            )}

            {currentQuestion.type === "textarea" && (
              <div>
                <Textarea
                  value={formData[currentQuestion.id]}
                  onChange={(e) => setFormData({...formData, [currentQuestion.id]: e.target.value})}
                  placeholder="Descreva aqui ou use o microfone/IA..."
                  rows={8}
                  className="mt-2"
                />
              </div>
            )}

            {(currentQuestion.type === "list-simple" || currentQuestion.type === "list-checkbox" || currentQuestion.type === "list-internal-external") && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Adicionar Item</Label>
                  <Input
                    value={tempInput.item}
                    onChange={(e) => setTempInput({...tempInput, item: e.target.value})}
                    placeholder="Digite o item..."
                    onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  />
                  
                  {currentQuestion.hasRequiredDesired && (
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={tempInput.required}
                          onCheckedChange={(v) => setTempInput({...tempInput, required: v})}
                        />
                        <Label className="text-sm font-semibold text-red-600">
                          Requerido (Necessário para entrar)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={tempInput.desired}
                          onCheckedChange={(v) => setTempInput({...tempInput, desired: v})}
                        />
                        <Label className="text-sm font-semibold text-blue-600">
                          Desejado (Para desenvolvimento)
                        </Label>
                      </div>
                    </div>
                  )}

                  {currentQuestion.type === "list-internal-external" && (
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={tempInput.required}
                          onCheckedChange={(v) => setTempInput({...tempInput, required: v})}
                        />
                        <Label className="text-sm font-semibold text-purple-600">Interno</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={tempInput.desired}
                          onCheckedChange={(v) => setTempInput({...tempInput, desired: v})}
                        />
                        <Label className="text-sm font-semibold text-green-600">Externo</Label>
                      </div>
                    </div>
                  )}

                  <Button onClick={addItem} className="w-full">+ Adicionar Item</Button>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-sm text-gray-600">Itens Adicionados ({formData[currentQuestion.id]?.length || 0})</Label>
                  <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                    {formData[currentQuestion.id]?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {typeof item === 'string' ? item : item.item}
                          </p>
                          {typeof item === 'object' && currentQuestion.hasRequiredDesired && (
                            <div className="flex gap-3 mt-1">
                              {item.required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Requerido</span>}
                              {item.desired && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Desejado</span>}
                            </div>
                          )}
                          {typeof item === 'object' && currentQuestion.type === "list-internal-external" && (
                            <div className="flex gap-3 mt-1">
                              {item.internal && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Interno</span>}
                              {item.external && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Externo</span>}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>Remover</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < questions.length - 1 ? (
            <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Salvar Descrição</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
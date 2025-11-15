import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Target, Eye, Heart, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { valuesSuggestions } from "../components/assessment/AssessmentCriteria";
import { toast } from "sonner";

export default function MissaoVisaoValores() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [step, setStep] = useState(1);

  const [missionAnswers, setMissionAnswers] = useState({
    products_services: "",
    contribution: "",
    how_to_deliver: "",
    differential: ""
  });

  const [visionAnswers, setVisionAnswers] = useState({
    become: "",
    niche_direction: "",
    growth_ambition: "",
    timeframe: "",
    big_dream: ""
  });

  const [valuesAnswers, setValuesAnswers] = useState({
    intolerables: ["", "", ""],
    desired_behaviors: ["", "", ""]
  });

  const [selectedValues, setSelectedValues] = useState([]);
  const [generatedMission, setGeneratedMission] = useState("");
  const [generatedVision, setGeneratedVision] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("MissaoVisaoValores"));
    } finally {
      setLoading(false);
    }
  };

  const generateMission = async () => {
    setSubmitting(true);
    try {
      const prompt = `
Crie uma declaração de MISSÃO profissional para uma oficina automotiva baseada nas respostas:

1. Produtos/serviços oferecidos: ${missionAnswers.products_services}
2. Contribuição para a sociedade: ${missionAnswers.contribution}
3. Como entregar: ${missionAnswers.how_to_deliver}
4. Diferencial: ${missionAnswers.differential}

A missão deve ser uma única frase clara, objetiva e inspiradora que engrandeça a oficina.
`;
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedMission(response);
      toast.success("Missão gerada!");
      setStep(2);
    } catch (error) {
      toast.error("Erro ao gerar missão");
    } finally {
      setSubmitting(false);
    }
  };

  const generateVision = async () => {
    setSubmitting(true);
    try {
      const prompt = `
Crie uma declaração de VISÃO inspiradora para uma oficina automotiva baseada nas respostas:

1. O que quer se tornar: ${visionAnswers.become}
2. Direção/nicho: ${visionAnswers.niche_direction}
3. Ambição de crescimento: ${visionAnswers.growth_ambition}
4. Prazo: ${visionAnswers.timeframe}
5. Grande sonho: ${visionAnswers.big_dream}

A visão deve estabelecer onde quer chegar com prazo definido. Seja inspiradora e ambiciosa.
`;
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedVision(response);
      toast.success("Visão gerada!");
      setStep(3);
    } catch (error) {
      toast.error("Erro ao gerar visão");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleValue = (value) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter(v => v !== value));
    } else {
      if (selectedValues.length < 7) {
        setSelectedValues([...selectedValues, value]);
      } else {
        toast.error("Selecione no máximo 7 valores");
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedValues.length < 4) {
      toast.error("Selecione de 4 a 7 valores");
      return;
    }

    setSubmitting(true);
    try {
      const prompt = `
Para cada um dos valores abaixo, crie:
1. Uma definição clara e objetiva
2. 3 evidências comportamentais práticas

Valores: ${selectedValues.join(", ")}

Contexto: oficina automotiva
Retorne em formato JSON com a estrutura:
{
  "values": [
    {
      "name": "valor",
      "definition": "definição",
      "behavioral_evidence": ["evidência 1", "evidência 2", "evidência 3"]
    }
  ]
}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            values: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  definition: { type: "string" },
                  behavioral_evidence: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      await base44.entities.MissionVisionValues.create({
        workshop_id: workshop?.id || null,
        mission_answers: missionAnswers,
        mission_statement: generatedMission,
        vision_answers: visionAnswers,
        vision_statement: generatedVision,
        values_answers: valuesAnswers,
        core_values: response.values,
        completed: true
      });

      toast.success("Missão, Visão e Valores definidos!");
      navigate(createPageUrl("Home"));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Missão, Visão e Valores
          </h1>
          <p className="text-lg text-gray-600">Defina a cultura e direção da sua oficina</p>
        </div>

        {/* Step 1: Missão */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>1. Criação da Missão</CardTitle>
                  <CardDescription>Responda as perguntas para gerar sua missão</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>1. Quais produtos ou serviços sua oficina oferece?</Label>
                <Textarea
                  value={missionAnswers.products_services}
                  onChange={(e) => setMissionAnswers({...missionAnswers, products_services: e.target.value})}
                  placeholder="Ex: Manutenção preventiva e corretiva, diagnóstico eletrônico..."
                />
              </div>
              <div>
                <Label>2. Qual a contribuição ou importância deste produto ou serviços para a sociedade?</Label>
                <Textarea
                  value={missionAnswers.contribution}
                  onChange={(e) => setMissionAnswers({...missionAnswers, contribution: e.target.value})}
                  placeholder="Ex: Garantir segurança e mobilidade..."
                />
              </div>
              <div>
                <Label>3. Como sua oficina quer oferecer esses produtos/serviços?</Label>
                <Textarea
                  value={missionAnswers.how_to_deliver}
                  onChange={(e) => setMissionAnswers({...missionAnswers, how_to_deliver: e.target.value})}
                  placeholder="Ex: Com excelência técnica, transparência..."
                />
              </div>
              <div>
                <Label>4. Qual o diferencial no que a sua oficina faz para a sociedade, clientes internos e externos?</Label>
                <Textarea
                  value={missionAnswers.differential}
                  onChange={(e) => setMissionAnswers({...missionAnswers, differential: e.target.value})}
                  placeholder="Ex: Atendimento humanizado, diagnóstico preciso..."
                />
              </div>
              <Button
                onClick={generateMission}
                disabled={submitting || !missionAnswers.products_services}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Missão...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Missão com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Visão */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-2 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-lg">Missão Definida</h3>
                </div>
                <p className="text-gray-700 italic text-lg bg-green-50 p-4 rounded-lg border border-green-200">
                  "{generatedMission}"
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>2. Criação da Visão</CardTitle>
                    <CardDescription>Defina onde sua oficina quer chegar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>1. No que sua oficina quer se tornar?</Label>
                  <Input
                    value={visionAnswers.become}
                    onChange={(e) => setVisionAnswers({...visionAnswers, become: e.target.value})}
                    placeholder="Ex: Referência em manutenção premium..."
                  />
                </div>
                <div>
                  <Label>2. Para qual direção, nicho de mercado, deseja apontar seus esforços?</Label>
                  <Input
                    value={visionAnswers.niche_direction}
                    onChange={(e) => setVisionAnswers({...visionAnswers, niche_direction: e.target.value})}
                    placeholder="Ex: Veículos premium e importados..."
                  />
                </div>
                <div>
                  <Label>3. Quanto estou disposto a investir nisso? Qual a minha sede de crescimento? Onde realmente eu quero chegar?</Label>
                  <Textarea
                    value={visionAnswers.growth_ambition}
                    onChange={(e) => setVisionAnswers({...visionAnswers, growth_ambition: e.target.value})}
                    placeholder="Ex: Investir 30% do lucro, expandir para 3 unidades..."
                  />
                </div>
                <div>
                  <Label>4. Em quanto tempo se espera atingir o estado desejado?</Label>
                  <Input
                    value={visionAnswers.timeframe}
                    onChange={(e) => setVisionAnswers({...visionAnswers, timeframe: e.target.value})}
                    placeholder="Ex: 5 anos..."
                  />
                </div>
                <div>
                  <Label>5. Qual é o grande sonho/objetivo com essa oficina?</Label>
                  <Textarea
                    value={visionAnswers.big_dream}
                    onChange={(e) => setVisionAnswers({...visionAnswers, big_dream: e.target.value})}
                    placeholder="Ex: Ser a maior rede de oficinas premium do estado..."
                  />
                </div>
                <Button
                  onClick={generateVision}
                  disabled={submitting || !visionAnswers.become}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Visão...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Visão com IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Valores */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="border-2 border-green-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-lg">Missão</h3>
                </div>
                <p className="text-gray-700 italic bg-green-50 p-4 rounded-lg">"{generatedMission}"</p>
                
                <div className="flex items-center gap-3 mt-4">
                  <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  <h3 className="font-bold text-lg">Visão</h3>
                </div>
                <p className="text-gray-700 italic bg-purple-50 p-4 rounded-lg">"{generatedVision}"</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle>3. Definição de Valores</CardTitle>
                    <CardDescription>Selecione de 4 a 7 valores para sua cultura</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base mb-3 block">Valores Selecionados: {selectedValues.length}/7</Label>
                  <div className="flex flex-wrap gap-2">
                    {valuesSuggestions.map((value) => (
                      <Badge
                        key={value}
                        variant={selectedValues.includes(value) ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1.5 ${
                          selectedValues.includes(value) 
                            ? 'bg-pink-600 hover:bg-pink-700' 
                            : 'hover:bg-pink-50'
                        }`}
                        onClick={() => toggleValue(value)}
                      >
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selectedValues.length < 4 || selectedValues.length > 7}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Definições e Evidências com IA
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
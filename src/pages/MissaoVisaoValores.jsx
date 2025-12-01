import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Target, Eye, Heart, Sparkles, CheckCircle2, Upload, Download, Edit2, Palette, RefreshCw, Lock, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { valuesSuggestions } from "../components/assessment/AssessmentCriteria";
import { toast } from "sonner";
import { differenceInMonths, format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MissaoVisaoValores() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [step, setStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  
  // Controle de regeneração e edição
  const [lastGenerationDate, setLastGenerationDate] = useState(null);
  const [isViewingExisting, setIsViewingExisting] = useState(false);

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
  const [generatedCoreValues, setGeneratedCoreValues] = useState([]);
  
  // Customização
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");

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
      
      if (userWorkshop?.logo_url) {
        setLogoUrl(userWorkshop.logo_url);
      }
      if (userWorkshop?.brand_colors) {
        setPrimaryColor(userWorkshop.brand_colors.primary || "#3b82f6");
        setSecondaryColor(userWorkshop.brand_colors.secondary || "#8b5cf6");
      }

      // Verificar histórico de geração
      if (userWorkshop) {
        const history = await base44.entities.MissionVisionValues.filter({ workshop_id: userWorkshop.id }, '-created_date', 1);
        if (history && history.length > 0) {
          const lastDoc = history[0];
          
          // Se já existe um documento completo
          if (lastDoc.completed) {
            setGeneratedMission(lastDoc.mission_statement || userWorkshop.mission || "");
            setGeneratedVision(lastDoc.vision_statement || userWorkshop.vision || "");
            setGeneratedCoreValues(lastDoc.core_values || []);
            
            // Recuperar respostas anteriores
            if (lastDoc.mission_answers) setMissionAnswers(lastDoc.mission_answers);
            if (lastDoc.vision_answers) setVisionAnswers(lastDoc.vision_answers);
            if (lastDoc.values_answers) setValuesAnswers(lastDoc.values_answers);
            
            setLastGenerationDate(lastDoc.created_date);
            setIsViewingExisting(true);
            setStep(4); // Pula para a tela de visualização/edição
          }
        } else if (userWorkshop.mission) {
          // Fallback: oficina tem missão mas não achou histórico (migração ou dados antigos)
          setGeneratedMission(userWorkshop.mission);
          setGeneratedVision(userWorkshop.vision || "");
          // Tenta reconstruir valores se possível, ou deixa vazio para edição manual
          setGeneratedCoreValues([]); 
          setIsViewingExisting(true);
          setStep(4);
        }
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
      // Se erro, permite tentar de novo ou redireciona se for auth
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);
      
      if (workshop) {
        await base44.entities.Workshop.update(workshop.id, { logo_url: file_url });
      }
      
      toast.success("Logo carregado!");
    } catch (error) {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleColorChange = async (type, color) => {
    if (type === "primary") {
      setPrimaryColor(color);
    } else {
      setSecondaryColor(color);
    }

    if (workshop) {
      await base44.entities.Workshop.update(workshop.id, {
        brand_colors: {
          primary: type === "primary" ? color : primaryColor,
          secondary: type === "secondary" ? color : secondaryColor
        }
      });
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

  const handleGenerateValues = async () => {
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

      setGeneratedCoreValues(response.values);
      toast.success("Valores gerados!");
      setStep(4);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar valores");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDocument = async () => {
    setSubmitting(true);
    try {
      if (!workshop) {
        toast.error("Nenhuma oficina encontrada para salvar o documento.");
        return;
      }

      // Atualizar oficina com os dados de cultura
      await base44.entities.Workshop.update(workshop.id, {
        mission: generatedMission,
        vision: generatedVision,
        values: generatedCoreValues.map(v => v.name),
        logo_url: logoUrl,
        brand_colors: { primary: primaryColor, secondary: secondaryColor }
      });

      // Se for uma nova geração (não existente), cria histórico
      // Se for edição de existente, podemos optar por criar um novo histórico ou atualizar o último.
      // Para manter o rastro de alterações, vamos criar um novo registro de histórico se houve mudanças significativas ou apenas atualizar a oficina.
      // O usuário pediu "editar isto", então atualizar a oficina é o principal.
      
      // Vamos atualizar o registro de histórico mais recente se estivermos editando, para manter sincronizado
      if (isViewingExisting && lastGenerationDate) {
        const history = await base44.entities.MissionVisionValues.filter({ workshop_id: workshop.id }, '-created_date', 1);
        if (history && history.length > 0) {
           await base44.entities.MissionVisionValues.update(history[0].id, {
             mission_statement: generatedMission,
             vision_statement: generatedVision,
             core_values: generatedCoreValues
           });
        }
      } else {
        // Cria novo histórico se for a primeira vez
        await base44.entities.MissionVisionValues.create({
          workshop_id: workshop.id,
          mission_answers: missionAnswers,
          mission_statement: generatedMission,
          vision_answers: visionAnswers,
          vision_statement: generatedVision,
          values_answers: valuesAnswers,
          core_values: generatedCoreValues,
          completed: true
        });
      }

      toast.success(isViewingExisting ? "Alterações salvas com sucesso!" : "Cultura organizacional criada com sucesso!");
      // Não navegar para home se estiver editando, apenas confirma
      if (!isViewingExisting) {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateAll = () => {
    // Resetar tudo e voltar para o passo 1
    if (window.confirm("Tem certeza? Isso apagará o documento atual e iniciará um novo processo com IA.")) {
      setStep(1);
      setIsViewingExisting(false);
      setLastGenerationDate(null);
      setGeneratedMission("");
      setGeneratedVision("");
      setGeneratedCoreValues([]);
      setSelectedValues([]);
    }
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Missão, Visão e Valores - ${workshop?.name || 'Oficina'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
            
            body { 
              font-family: 'Poppins', sans-serif; 
              padding: 40px; 
              color: #333;
              background: white; /* Cleaner for print */
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 2px solid ${primaryColor};
            }
            .logo { 
              max-height: 100px; 
              max-width: 200px;
              object-fit: contain;
              margin-bottom: 10px; 
            }
            .subtitle {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-top: 5px;
              font-weight: 600;
            }
            .section { 
              margin-bottom: 30px; 
              background: #fff;
              padding: 20px;
              border-radius: 12px;
              border: 1px solid #eee;
              page-break-inside: avoid;
            }
            h1 { 
              color: ${primaryColor}; 
              font-size: 26px; 
              margin: 10px 0 5px 0;
            }
            h2 { 
              color: ${secondaryColor}; 
              font-size: 20px; 
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 10px;
              border-bottom: 1px solid ${secondaryColor}30;
              padding-bottom: 10px;
            }
            .statement { 
              font-style: italic; 
              font-size: 16px; 
              line-height: 1.6; 
              color: #444;
              background: ${primaryColor}08;
              padding: 20px;
              border-radius: 8px;
              margin: 10px 0;
              border-left: 4px solid ${primaryColor};
            }
            .value-item { 
              margin-bottom: 25px; 
              padding: 20px;
              background: ${secondaryColor}08;
              border-radius: 8px;
            }
            .value-name { 
              font-weight: bold; 
              font-size: 18px; 
              color: ${primaryColor};
              margin-bottom: 10px;
            }
            .value-definition { 
              margin-bottom: 10px; 
              color: #666;
            }
            .evidence { 
              margin-left: 20px; 
              color: #555; 
            }
            .evidence li { 
              margin-bottom: 8px; 
            }
            @media print {
              body { background: white; }
              .section { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ''}
            <h1>${workshop?.name || 'Minha Oficina'}</h1>
            <p class="subtitle">Oficinas Master Educação Empresarial</p>
            <p style="margin-top: 10px; color: #666;">Documento de Cultura Organizacional</p>
          </div>
          
          <div class="section">
            <h2>🎯 Missão</h2>
            <div class="statement">${generatedMission}</div>
          </div>
          
          <div class="section">
            <h2>👁️ Visão</h2>
            <div class="statement">${generatedVision}</div>
          </div>
          
          <div class="section">
            <h2>❤️ Valores</h2>
            ${generatedCoreValues.map(value => `
              <div class="value-item">
                <div class="value-name">${value.name}</div>
                <div class="value-definition">${value.definition}</div>
                <ul class="evidence">
                  ${value.behavioral_evidence.map(ev => `<li>${ev}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
          <p className="text-lg text-gray-600">Defina a cultura e direção da sua oficina com IA</p>
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold text-lg">Missão Definida</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
                {isEditing ? (
                  <Textarea
                    value={generatedMission}
                    onChange={(e) => setGeneratedMission(e.target.value)}
                    className="text-lg italic"
                  />
                ) : (
                  <p className="text-gray-700 italic text-lg bg-green-50 p-4 rounded-lg border border-green-200">
                    "{generatedMission}"
                  </p>
                )}
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
                  <Label>3. Quanto estou disposto a investir nisso? Qual a minha sede de crescimento?</Label>
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
                  onClick={handleGenerateValues}
                  disabled={submitting || selectedValues.length < 4 || selectedValues.length > 7}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Valores...
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

        {/* Step 4: Personalização e Preview */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Customização */}
            <Card className="border-2" style={{ borderColor: primaryColor }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Palette className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>4. Personalização do Documento</CardTitle>
                    <CardDescription>Adicione logo e cores da sua marca</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Logo da Oficina</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-lg border-2 border-gray-200" />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                        disabled={uploadingLogo}
                      />
                      <Button
                        onClick={() => document.getElementById('logo-upload').click()}
                        variant="outline"
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {logoUrl ? 'Trocar Logo' : 'Adicionar Logo'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        placeholder="#8b5cf6"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview do Documento */}
            <Card className="border-2" style={{ borderColor: primaryColor }}>
              <CardHeader style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)` }}>
                <div className="text-center">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="w-32 h-32 object-contain mx-auto mb-4" />
                  )}
                  <h2 className="text-2xl font-bold" style={{ color: primaryColor }}>
                    {workshop?.name || 'Oficina'}
                  </h2>
                  <p className="text-gray-600 mt-2">Documento de Cultura Organizacional</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 mt-6">
                {/* Missão */}
                <div className="p-6 rounded-lg" style={{ background: `${primaryColor}10`, borderLeft: `4px solid ${primaryColor}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5" style={{ color: primaryColor }} />
                    <h3 className="font-bold text-xl" style={{ color: primaryColor }}>Missão</h3>
                  </div>
                  <Textarea
                    value={generatedMission}
                    onChange={(e) => setGeneratedMission(e.target.value)}
                    className="text-lg italic border-0 bg-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Visão */}
                <div className="p-6 rounded-lg" style={{ background: `${secondaryColor}10`, borderLeft: `4px solid ${secondaryColor}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5" style={{ color: secondaryColor }} />
                    <h3 className="font-bold text-xl" style={{ color: secondaryColor }}>Visão</h3>
                  </div>
                  <Textarea
                    value={generatedVision}
                    onChange={(e) => setGeneratedVision(e.target.value)}
                    className="text-lg italic border-0 bg-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Valores */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart className="w-5 h-5" style={{ color: primaryColor }} />
                    <h3 className="font-bold text-xl" style={{ color: primaryColor }}>Valores</h3>
                  </div>
                  {generatedCoreValues.map((value, index) => (
                    <div key={index} className="mb-6 p-4 rounded-lg" style={{ background: `${secondaryColor}08` }}>
                      <Input
                        value={value.name}
                        onChange={(e) => {
                          const updated = [...generatedCoreValues];
                          updated[index].name = e.target.value;
                          setGeneratedCoreValues(updated);
                        }}
                        className="font-bold text-lg mb-2 border-0 bg-transparent"
                        style={{ color: primaryColor }}
                      />
                      <Textarea
                        value={value.definition}
                        onChange={(e) => {
                          const updated = [...generatedCoreValues];
                          updated[index].definition = e.target.value;
                          setGeneratedCoreValues(updated);
                        }}
                        className="mb-2 border-0 bg-transparent resize-none"
                        rows={2}
                      />
                      <ul className="space-y-1 text-sm text-gray-600">
                        {value.behavioral_evidence.map((ev, evIndex) => (
                          <li key={evIndex} className="flex items-start gap-2">
                            <span style={{ color: primaryColor }}>•</span>
                            <Input
                              value={ev}
                              onChange={(e) => {
                                const updated = [...generatedCoreValues];
                                updated[index].behavioral_evidence[evIndex] = e.target.value;
                                setGeneratedCoreValues(updated);
                              }}
                              className="border-0 bg-transparent p-0 h-auto"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={handleSaveDocument}
                  disabled={submitting}
                  className="flex-1"
                  style={{ background: primaryColor }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isViewingExisting ? "Salvar Alterações" : "Salvar Documento Final"}
                    </>
                  )}
                </Button>
              </div>

              {isViewingExisting && lastGenerationDate && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Regeneração com IA</h4>
                      <p className="text-xs text-gray-500">
                        Última geração: {format(new Date(lastGenerationDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    
                    {differenceInMonths(new Date(), new Date(lastGenerationDate)) >= 6 ? (
                      <Button
                        onClick={handleRegenerateAll}
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refazer Documento com IA
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded text-xs font-medium">
                        <Lock className="w-3 h-3" />
                        Disponível em {format(addMonths(new Date(lastGenerationDate), 6), "dd/MM/yyyy")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
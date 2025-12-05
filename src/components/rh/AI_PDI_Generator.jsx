import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Sparkles, Target, Calendar, Award, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AI_PDI_Generator({ employee }) {
  const [loading, setLoading] = useState(false);
  const [pdi, setPdi] = useState(null);

  const generatePDI = async () => {
    setLoading(true);
    try {
      const prompt = `
      Você é um especialista em desenvolvimento humano e RH.
      Crie um Plano de Desenvolvimento Individual (PDI) estruturado para:
      
      Colaborador: ${employee.full_name}
      Cargo: ${employee.position}
      Área: ${employee.area}
      Nível de Maturidade: ${employee.current_maturity_level || 'Não definido'}
      Tempo de Casa: ${new Date(employee.hire_date).toLocaleDateString()}
      
      O PDI deve conter:
      1. Foco de Desenvolvimento (Curto, Médio, Longo prazo)
      2. 3 Competências a desenvolver (Técnicas ou Comportamentais)
      3. Ações práticas para cada competência (70/20/10: Experiência, Exposição, Educação)
      4. Indicadores de Sucesso (Como medir?)
      
      Retorne APENAS um JSON com a estrutura:
      {
        "focus_areas": [{"period": "Curto Prazo (3 meses)", "goal": "..."}],
        "competencies": [
          {
            "name": "...",
            "type": "Técnica/Comportamental",
            "actions": ["...", "..."],
            "metrics": "..."
          }
        ],
        "motivation_message": "..."
      }
      `;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            focus_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  period: { type: "string" },
                  goal: { type: "string" }
                }
              }
            },
            competencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  actions: { type: "array", items: { type: "string" } },
                  metrics: { type: "string" }
                }
              }
            },
            motivation_message: { type: "string" }
          }
        }
      });

      setPdi(response);
      toast.success("PDI gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-purple-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-purple-600" />
          Assistente de PDI (Plano de Desenvolvimento Individual)
        </CardTitle>
        <CardDescription>
          Use a IA para estruturar o crescimento profissional do colaborador
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!pdi ? (
          <div className="text-center py-12">
            <div className="bg-purple-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BrainIcon className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Vamos criar um PDI?</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              A inteligência artificial analisará o perfil de {employee.full_name} para sugerir um plano de ação focado em resultados.
            </p>
            <Button 
              onClick={generatePDI} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg h-auto"
            >
              {loading ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Analisando Perfil...</>
              ) : (
                <><Sparkles className="w-6 h-6 mr-2" /> Gerar PDI Agora</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Focos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pdi.focus_areas?.map((focus, i) => (
                <Card key={i} className="bg-slate-50 border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-purple-700 font-semibold">
                      <Calendar className="w-4 h-4" />
                      {focus.period}
                    </div>
                    <p className="text-sm text-gray-700">{focus.goal}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Competências */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Competências a Desenvolver
              </h3>
              <div className="grid gap-4">
                {pdi.competencies?.map((comp, i) => (
                  <div key={i} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{comp.name}</h4>
                        <Badge variant="secondary" className="mt-1">{comp.type}</Badge>
                      </div>
                      <div className="bg-green-50 text-green-700 px-3 py-1 rounded text-xs font-medium">
                        {comp.metrics}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ações Práticas:</p>
                      <ul className="space-y-2">
                        {comp.actions?.map((action, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivação */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl text-center">
              <p className="text-lg font-medium italic">"{pdi.motivation_message}"</p>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" onClick={() => setPdi(null)}>
                Voltar / Gerar Novo
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => toast.success("PDI salvo no histórico! (Simulação)")}>
                <Award className="w-4 h-4 mr-2" />
                Salvar PDI
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrainIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  )
}
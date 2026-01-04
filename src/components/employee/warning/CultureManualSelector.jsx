import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function CultureManualSelector({ workshopId, onSelect, currentValue }) {
  const [extracting, setExtracting] = React.useState(false);

  const { data: manual, isLoading } = useQuery({
    queryKey: ['culture-manual', workshopId],
    queryFn: async () => {
      const result = await base44.entities.CultureManual.filter({ workshop_id: workshopId });
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    },
    enabled: !!workshopId
  });

  const extractRuleWithAI = async () => {
    if (!manual) return;
    
    setExtracting(true);
    try {
      const prompt = `Você é um especialista em RH. Analise este Manual da Cultura da empresa e identifique as principais regras de conduta, comportamento esperado e normas internas que PODEM SER DESCUMPRIDAS por colaboradores.

Missão: ${manual.mission || 'Não informada'}
Visão: ${manual.vision || 'Não informada'}
Valores: ${manual.values?.join(', ') || 'Não informados'}

Pilares Culturais:
${manual.culture_pillars?.map(p => `- ${p.title}: ${p.description}`).join('\n') || 'Não informados'}

Expectativas da Empresa:
${manual.expectations?.from_company?.join('\n') || 'Não informadas'}

Expectativas dos Colaboradores:
${manual.expectations?.from_employees?.join('\n') || 'Não informadas'}

Liste de forma clara e objetiva as 10 principais regras/normas que podem gerar advertências.
Formato: "- Regra 1\n- Regra 2..."`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            rules: { type: "array", items: { type: "string" } }
          }
        }
      });

      const rulesText = response.rules.join('\n\n');
      onSelect(rulesText);
      toast.success("Regras extraídas do manual!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao extrair regras: " + error.message);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Regra do Manual da Cultura
        </Label>
        {manual && (
          <Button
            variant="ghost"
            size="xs"
            onClick={extractRuleWithAI}
            disabled={extracting}
            className="text-purple-600 hover:bg-purple-50"
          >
            <Wand2 className="w-3 h-3 mr-1" />
            {extracting ? "Extraindo..." : "IA: Buscar Regras"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando manual...
        </div>
      ) : !manual ? (
        <Card className="p-3 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ Manual da Cultura não cadastrado. Configure em Cultura Organizacional.
          </p>
        </Card>
      ) : (
        <>
          <Textarea
            rows={4}
            value={currentValue}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="Cole ou descreva a regra do manual que foi descumprida..."
            className="bg-white text-sm"
          />
          <p className="text-xs text-gray-500">
            💡 Use a IA para buscar automaticamente as regras do manual cadastrado
          </p>
        </>
      )}
    </div>
  );
}
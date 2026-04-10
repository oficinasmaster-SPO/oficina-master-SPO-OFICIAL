import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AudioTranscriptionField from "@/components/aceleracao/AudioTranscriptionField";
import NextSteps from "@/components/aceleracao/NextSteps";

export default function ObservationsSection({ formData, setFormData }) {
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAISummary] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observações e Próximos Passos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AudioTranscriptionField
          label="Observações do Consultor"
          value={formData.observacoes_consultor}
          onChange={(text) => setFormData(prev => ({ ...prev, observacoes_consultor: text }))}
          placeholder="Notas e observações sobre o atendimento..."
          rows={4}
        />
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Próximos Passos (Para ATA)</Label>
          <p className="text-sm text-gray-500 mb-4">Estas ações constarão no rodapé da ATA em formato de lista estruturada.</p>
          <NextSteps
            steps={formData.proximos_passos_list || []}
            onChange={(steps) => setFormData(prev => ({ ...prev, proximos_passos_list: steps }))}
            editable={true}
          />
        </div>

        <AudioTranscriptionField
          label="Observações Adicionais (Antigo Próximos Passos)"
          value={formData.proximos_passos}
          onChange={(text) => setFormData(prev => ({ ...prev, proximos_passos: text }))}
          placeholder="Notas textuais extras caso necessário..."
          rows={3}
        />

        {formData.id && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              setShowAISummary(true);
              try {
                const { data } = await base44.functions.invoke('generateAtaSummaryWithContext', {
                  atendimento_id: formData.id
                });
                setAISummary(data.analise);
                toast.success("Análise com IA gerada!");
              } catch (error) {
                toast.error("Erro: " + error.message);
                setShowAISummary(false);
              }
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Resumo com IA (últimas 10 atas)
          </Button>
        )}

        {showAISummary && aiSummary && (
          <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
            <h4 className="font-semibold text-blue-900">📊 Análise Inteligente</h4>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Resumo:</p>
                <p className="text-gray-700">{aiSummary.resumo_executivo}</p>
              </div>
              {aiSummary.problemas_recorrentes?.length > 0 && (
                <div>
                  <p className="font-medium">Problemas Recorrentes:</p>
                  <ul className="list-disc ml-4 text-gray-700">
                    {aiSummary.problemas_recorrentes.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {aiSummary.recomendacoes?.length > 0 && (
                <div>
                  <p className="font-medium">Recomendações:</p>
                  <ul className="list-disc ml-4 text-gray-700">
                    {aiSummary.recomendacoes.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
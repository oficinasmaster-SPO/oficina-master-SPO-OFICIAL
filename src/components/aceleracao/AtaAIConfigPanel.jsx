import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Settings2, Lightbulb, Loader2 } from "lucide-react";

const SECTIONS = [
  { key: "pauta", label: "Pauta / Tópicos discutidos", default: true },
  { key: "objetivos", label: "Objetivos do atendimento", default: true },
  { key: "observacoes", label: "Observações do consultor", default: true },
  { key: "decisoes", label: "Decisões tomadas", default: true },
  { key: "acoes", label: "Ações de acompanhamento", default: true },
  { key: "proximos_passos", label: "Próximos passos", default: true },
  { key: "checklist", label: "Checklist de diagnóstico", default: false },
  { key: "processos", label: "Processos (MAPs) vinculados", default: false },
  { key: "videoaulas", label: "Videoaulas vinculadas", default: false },
  { key: "metricas", label: "Métricas e indicadores", default: true },
];

const TONES = [
  { value: "formal", label: "Formal — Linguagem corporativa e técnica" },
  { value: "direto", label: "Direto — Objetivo e sem rodeios" },
  { value: "informal", label: "Informal — Conversacional e acessível" },
  { value: "motivacional", label: "Motivacional — Encorajador e positivo" },
];

export default function AtaAIConfigPanel({ onGenerate, isGenerating }) {
  const [selectedSections, setSelectedSections] = useState(
    SECTIONS.filter(s => s.default).map(s => s.key)
  );
  const [tone, setTone] = useState("formal");
  const [suggestNextSteps, setSuggestNextSteps] = useState(true);

  const toggleSection = (key) => {
    setSelectedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedSections(SECTIONS.map(s => s.key));
  const deselectAll = () => setSelectedSections([]);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50">
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Configurações da ATA por IA</h3>
        </div>

        {/* Seleção de seções */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">Seções a incluir no resumo</Label>
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-blue-600 hover:underline">Todas</button>
              <span className="text-xs text-gray-300">|</span>
              <button type="button" onClick={deselectAll} className="text-xs text-blue-600 hover:underline">Nenhuma</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map(section => (
              <label
                key={section.key}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                  selectedSections.includes(section.key)
                    ? "bg-purple-50 border-purple-300 text-purple-900"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <Checkbox
                  checked={selectedSections.includes(section.key)}
                  onCheckedChange={() => toggleSection(section.key)}
                />
                {section.label}
              </label>
            ))}
          </div>
        </div>

        {/* Tom da ata */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">Tom da ATA</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sugerir próximos passos */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
          <Checkbox
            checked={suggestNextSteps}
            onCheckedChange={setSuggestNextSteps}
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">Sugerir próximos passos adicionais</span>
            </div>
            <p className="text-xs text-amber-700 mt-0.5">
              A IA analisará o conteúdo da reunião e sugerirá ações complementares
            </p>
          </div>
        </label>

        {/* Botão gerar */}
        <Button
          type="button"
          className="w-full bg-purple-600 hover:bg-purple-700"
          disabled={isGenerating || selectedSections.length === 0}
          onClick={() => onGenerate({ selectedSections, tone, suggestNextSteps })}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando ATA com IA...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar ATA com IA
            </>
          )}
        </Button>

        {selectedSections.length === 0 && (
          <p className="text-xs text-red-500 text-center">Selecione ao menos uma seção</p>
        )}
      </CardContent>
    </Card>
  );
}
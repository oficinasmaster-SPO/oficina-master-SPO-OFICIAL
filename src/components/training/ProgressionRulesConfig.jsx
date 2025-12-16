import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

export default function ProgressionRulesConfig({ rules, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...rules, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Regras de Progressão
        </CardTitle>
        <p className="text-sm text-slate-600">
          Configure como os alunos podem progredir nesta aula
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Pode avançar mesmo reprovado</Label>
            <p className="text-xs text-slate-500">
              Permite continuar para próxima aula mesmo falhando na avaliação
            </p>
          </div>
          <Switch
            checked={rules.can_advance_if_failed}
            onCheckedChange={(val) => handleChange('can_advance_if_failed', val)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Permite refazer avaliação</Label>
            <p className="text-xs text-slate-500">
              Aluno pode tentar a avaliação novamente
            </p>
          </div>
          <Switch
            checked={rules.can_retake_assessment}
            onCheckedChange={(val) => handleChange('can_retake_assessment', val)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Pode pular direto para avaliação</Label>
            <p className="text-xs text-slate-500">
              Permite fazer avaliação sem assistir conteúdo
            </p>
          </div>
          <Switch
            checked={rules.can_skip_to_assessment}
            onCheckedChange={(val) => handleChange('can_skip_to_assessment', val)}
          />
        </div>

        <div className="space-y-2">
          <Label>Condição para liberar próxima aula</Label>
          <Select
            value={rules.next_lesson_unlock}
            onValueChange={(val) => handleChange('next_lesson_unlock', val)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Sempre liberada</SelectItem>
              <SelectItem value="after_completion">Após concluir esta aula</SelectItem>
              <SelectItem value="after_assessment_attempt">
                Após tentar avaliação
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Exige aprovação na avaliação</Label>
            <p className="text-xs text-slate-500">
              Aula só é considerada completa com aprovação
            </p>
          </div>
          <Switch
            checked={rules.require_assessment_pass}
            onCheckedChange={(val) => handleChange('require_assessment_pass', val)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
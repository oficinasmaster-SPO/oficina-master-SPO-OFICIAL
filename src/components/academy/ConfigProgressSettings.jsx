import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TrendingUp } from "lucide-react";

export default function ConfigProgressSettings({ settings, onChange }) {
  const progressSettings = settings?.progress_settings || {};

  const handleProgressChange = (field, value) => {
    onChange({
      ...settings,
      progress_settings: {
        ...progressSettings,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Progresso e Continuidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Retomar Última Aula Automaticamente</Label>
            <p className="text-xs text-gray-500">
              Levar o usuário direto para onde parou
            </p>
          </div>
          <Switch
            checked={settings?.allow_resume_last_lesson ?? true}
            onCheckedChange={(checked) => onChange({ ...settings, allow_resume_last_lesson: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Salvar Progresso Automaticamente</Label>
            <p className="text-xs text-gray-500">
              Registrar progresso em tempo real
            </p>
          </div>
          <Switch
            checked={progressSettings.auto_save_progress ?? true}
            onCheckedChange={(checked) => handleProgressChange('auto_save_progress', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Permitir Pular Aulas</Label>
            <p className="text-xs text-gray-500">
              Usuário pode navegar livremente
            </p>
          </div>
          <Switch
            checked={progressSettings.allow_skip_lessons ?? true}
            onCheckedChange={(checked) => handleProgressChange('allow_skip_lessons', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Exigir Conclusão Sequencial</Label>
            <p className="text-xs text-gray-500">
              Concluir módulo antes do próximo
            </p>
          </div>
          <Switch
            checked={progressSettings.require_sequential_completion ?? false}
            onCheckedChange={(checked) => handleProgressChange('require_sequential_completion', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Limite para Marcar como Concluído (%)</Label>
          <Input
            type="number"
            min="50"
            max="100"
            value={progressSettings.mark_complete_threshold ?? 90}
            onChange={(e) => handleProgressChange('mark_complete_threshold', parseInt(e.target.value))}
          />
          <p className="text-xs text-gray-500">
            % mínimo assistido para considerar aula concluída
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
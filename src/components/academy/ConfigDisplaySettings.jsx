import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Layout } from "lucide-react";

export default function ConfigDisplaySettings({ settings, onChange }) {
  const displaySettings = settings?.display_settings || {};

  const handleDisplayChange = (field, value) => {
    onChange({
      ...settings,
      display_settings: {
        ...displaySettings,
        [field]: value
      }
    });
  };

  const handleHomeSectionChange = (value) => {
    onChange({
      ...settings,
      default_home_section: value
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-600" />
            Seção Inicial da Vitrine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Primeira seção exibida ao usuário</Label>
            <Select 
              value={settings?.default_home_section || 'continue_assistindo'}
              onValueChange={handleHomeSectionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue_assistindo">Continue Assistindo</SelectItem>
                <SelectItem value="recomendados">Cursos Recomendados</SelectItem>
                <SelectItem value="novos_cursos">Novos Cursos</SelectItem>
                <SelectItem value="categorias">Por Categorias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            Elementos Visíveis nos Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Exibir Progresso do Curso</Label>
              <p className="text-xs text-gray-500">Mostrar barra de progresso nos cards</p>
            </div>
            <Switch
              checked={settings?.show_progress_globally ?? true}
              onCheckedChange={(checked) => onChange({ ...settings, show_progress_globally: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Exibir Duração Total</Label>
              <p className="text-xs text-gray-500">Mostrar tempo total do curso</p>
            </div>
            <Switch
              checked={displaySettings.show_duration ?? true}
              onCheckedChange={(checked) => handleDisplayChange('show_duration', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Exibir Nível de Dificuldade</Label>
              <p className="text-xs text-gray-500">Mostrar badge de dificuldade</p>
            </div>
            <Switch
              checked={displaySettings.show_difficulty ?? true}
              onCheckedChange={(checked) => handleDisplayChange('show_difficulty', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Exibir Cursos "Em Breve"</Label>
              <p className="text-xs text-gray-500">Mostrar cursos agendados</p>
            </div>
            <Switch
              checked={displaySettings.show_coming_soon ?? true}
              onCheckedChange={(checked) => handleDisplayChange('show_coming_soon', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Exibir Trailer do Curso</Label>
              <p className="text-xs text-gray-500">Mostrar vídeo de preview</p>
            </div>
            <Switch
              checked={displaySettings.show_course_trailer ?? false}
              onCheckedChange={(checked) => handleDisplayChange('show_course_trailer', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
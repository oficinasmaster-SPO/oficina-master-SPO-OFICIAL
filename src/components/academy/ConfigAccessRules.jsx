import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";

export default function ConfigAccessRules({ settings, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          Regras de Acesso e Permissão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Visibilidade da Academia</Label>
          <Select 
            value={settings?.academy_visibility || 'global'}
            onValueChange={(value) => onChange({ ...settings, academy_visibility: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global (todos veem)</SelectItem>
              <SelectItem value="por_oficina">Por Oficina</SelectItem>
              <SelectItem value="por_perfil">Por Perfil de Usuário</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Define quem pode visualizar a Academia de Treinamento
          </p>
        </div>

        <div className="space-y-2">
          <Label>Nível de Acesso Padrão aos Cursos</Label>
          <Select 
            value={settings?.default_access_level || 'livre'}
            onValueChange={(value) => onChange({ ...settings, default_access_level: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="livre">Livre (todos acessam)</SelectItem>
              <SelectItem value="restrito">Restrito (apenas atribuídos)</SelectItem>
              <SelectItem value="sob_convite">Sob Convite</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Define o comportamento padrão de acesso aos cursos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
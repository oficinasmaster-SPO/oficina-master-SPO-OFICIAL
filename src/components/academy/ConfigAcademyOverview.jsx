import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, BookOpen, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConfigAcademyOverview({ 
  settings, 
  stats, 
  onToggleAcademy,
  isLoading 
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Status da Academia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="academy-enabled">Academia de Treinamento</Label>
              <p className="text-xs text-gray-500">
                Ativar ou desativar toda a funcionalidade de treinamentos
              </p>
            </div>
            <Switch
              id="academy-enabled"
              checked={settings?.academy_enabled ?? true}
              onCheckedChange={onToggleAcademy}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {settings?.academy_enabled ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <Badge className="bg-green-100 text-green-700">Ativa</Badge>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600" />
                <Badge className="bg-red-100 text-red-700">Inativa</Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Total de Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.activeCourses || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              Usuários com Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.activeUsers || 0} ativos no mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Última Atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {settings?.last_updated 
                ? format(new Date(settings.last_updated), "dd/MM/yyyy", { locale: ptBR })
                : 'Nunca'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {settings?.updated_by || 'Sistema'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              Ver Logs de Alterações
            </Button>
            <Button variant="outline" size="sm">
              Exportar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
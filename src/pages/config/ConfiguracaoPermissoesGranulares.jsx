import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Save, RotateCcw, AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";
import PermissionMatrix from "@/components/permissions/PermissionMatrix";
import ModuleAccessConfig from "@/components/permissions/ModuleAccessConfig";
import PermissionPreview from "@/components/permissions/PermissionPreview";
import { jobRoles } from "@/components/lib/jobRoles";

export default function ConfiguracaoPermissoesGranulares() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [hasChanges, setHasChanges] = useState(false);
  const [permissions, setPermissions] = useState({});
  const queryClient = useQueryClient();

  // Buscar usuário atual
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Buscar configuração de permissões
  const { data: permissionsConfig, isLoading } = useQuery({
    queryKey: ['granular-permissions-config'],
    queryFn: async () => {
      try {
        const settings = await base44.entities.SystemSetting.filter({ key: 'granular_permissions' });
        if (settings && settings.length > 0) {
          try {
            const config = settings[0].value ? JSON.parse(settings[0].value) : {};
            setPermissions(config);
            return { id: settings[0].id, config };
          } catch (e) {
            console.error("Erro ao processar JSON de permissões:", e);
            return { id: settings[0].id, config: {} };
          }
        }
        return { id: null, config: {} };
      } catch (error) {
        console.error("Erro ao buscar permissões:", error);
        return { id: null, config: {} };
      }
    }
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (newPermissions) => {
      try {
        const oldConfig = permissionsConfig?.config || {};

        if (permissionsConfig?.id) {
          await base44.entities.SystemSetting.update(permissionsConfig.id, {
            value: JSON.stringify(newPermissions)
          });
        } else {
          await base44.entities.SystemSetting.create({
            key: 'granular_permissions',
            value: JSON.stringify(newPermissions),
            description: 'Configuração de permissões granulares por cargo e módulo'
          });
        }

        // Registrar log de auditoria
        await base44.functions.invoke('logRBACAction', {
          action_type: 'granular_permission_updated',
          target_type: 'granular_config',
          target_name: 'Configuração Granular de Permissões',
          changes: {
            before: oldConfig,
            after: newPermissions
          },
          notes: 'Atualização via interface de configuração'
        });
      } catch (error) {
        throw new Error("Erro ao salvar configurações");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['granular-permissions-config'] });
      setHasChanges(false);
      toast.success("Permissões salvas com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao salvar permissões");
    }
  });

  const handlePermissionChange = (newPermissions) => {
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(permissions);
  };

  const handleReset = () => {
    setPermissions(permissionsConfig?.config || {});
    setHasChanges(false);
    toast.info("Alterações descartadas");
  };

  // Verificar se é admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuração de Permissões Granulares</h1>
            <p className="text-gray-600 mt-1">
              Defina permissões específicas por cargo e módulo do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Alert de mudanças */}
      {hasChanges && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-900">
                Você tem alterações não salvas
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-yellow-300 text-yellow-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Defina permissões específicas para cada cargo (gerente, técnico, etc.)</li>
                <li>Configure o nível de acesso por módulo: Total, Visualização ou Bloqueado</li>
                <li>Use a matriz de permissões para configurações detalhadas por ação</li>
                <li>Admin sempre tem acesso total a todos os módulos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="matrix">Matriz de Permissões</TabsTrigger>
          <TabsTrigger value="modules">Acesso por Módulo</TabsTrigger>
          <TabsTrigger value="preview">Visualizar Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permissões Detalhada</CardTitle>
              <p className="text-sm text-gray-600">
                Configure permissões específicas (criar, ler, editar, deletar) para cada cargo e recurso
              </p>
            </CardHeader>
            <CardContent>
              <PermissionMatrix
                permissions={permissions}
                onChange={handlePermissionChange}
                jobRoles={jobRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Acesso por Módulo</CardTitle>
              <p className="text-sm text-gray-600">
                Defina o nível de acesso geral para cada módulo do sistema
              </p>
            </CardHeader>
            <CardContent>
              <ModuleAccessConfig
                permissions={permissions}
                onChange={handlePermissionChange}
                jobRoles={jobRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Visualização de Regras Configuradas</CardTitle>
              <p className="text-sm text-gray-600">
                Veja um resumo de todas as permissões configuradas
              </p>
            </CardHeader>
            <CardContent>
              <PermissionPreview
                permissions={permissions}
                jobRoles={jobRoles}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <CheckCircle2 className="w-4 h-4 inline mr-2 text-green-600" />
          {Object.keys(permissions).length} cargo(s) configurado(s)
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-5 h-5 mr-2" />
          Salvar Todas as Alterações
        </Button>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import ConfigAcademyOverview from "@/components/academy/ConfigAcademyOverview";
import ConfigDisplaySettings from "@/components/academy/ConfigDisplaySettings";
import ConfigProgressSettings from "@/components/academy/ConfigProgressSettings";
import ConfigAccessRules from "@/components/academy/ConfigAccessRules";

export default function ConfiguracaoAcademia() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['academy-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.TrainingAcademySettings.list();
      return allSettings[0] || null;
    }
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['all-courses'],
    queryFn: () => base44.entities.TrainingCourse.list()
  });

  React.useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        ...data,
        last_updated: new Date().toISOString(),
        updated_by: user?.full_name || user?.email,
        change_log: [
          ...(data.change_log || []),
          {
            timestamp: new Date().toISOString(),
            user: user?.full_name || user?.email,
            field: 'configuracoes_gerais',
            old_value: JSON.stringify(settings),
            new_value: JSON.stringify(data)
          }
        ]
      };

      if (settings?.id) {
        return await base44.entities.TrainingAcademySettings.update(settings.id, updateData);
      } else {
        return await base44.entities.TrainingAcademySettings.create(updateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['academy-settings']);
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  const handleSave = () => {
    if (localSettings) {
      saveMutation.mutate(localSettings);
    }
  };

  const handleToggleAcademy = (enabled) => {
    setLocalSettings({
      ...localSettings,
      academy_enabled: enabled
    });
  };

  const stats = {
    totalCourses: courses.length,
    activeCourses: courses.filter(c => c.status === 'publicado').length,
    totalUsers: 0,
    activeUsers: 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-8 h-8 text-blue-600" />
            Configuração da Academia
          </h1>
          <p className="text-gray-600 mt-2">
            Configure o comportamento e regras da Academia de Treinamento
          </p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="display">Exibição</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="access">Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ConfigAcademyOverview
            settings={localSettings}
            stats={stats}
            onToggleAcademy={handleToggleAcademy}
            isLoading={saveMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="display" className="mt-6">
          <ConfigDisplaySettings
            settings={localSettings}
            onChange={setLocalSettings}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <ConfigProgressSettings
            settings={localSettings}
            onChange={setLocalSettings}
          />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <ConfigAccessRules
            settings={localSettings}
            onChange={setLocalSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
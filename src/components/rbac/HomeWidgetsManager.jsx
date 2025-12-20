import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function HomeWidgetsManager() {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const roles = [
    { id: "diretor", label: "Diretor" },
    { id: "supervisor_loja", label: "Supervisor de Loja" },
    { id: "gerente", label: "Gerente" },
    { id: "lider_tecnico", label: "Líder Técnico" },
    { id: "financeiro", label: "Financeiro" },
    { id: "rh", label: "Recursos Humanos" },
    { id: "tecnico", label: "Técnico" },
    { id: "funilaria_pintura", label: "Funilaria e Pintura" },
    { id: "comercial", label: "Comercial" },
    { id: "consultor_vendas", label: "Consultor de Vendas" },
    { id: "marketing", label: "Marketing" },
    { id: "estoque", label: "Estoque" },
    { id: "administrativo", label: "Administrativo" },
    { id: "motoboy", label: "Motoboy" },
    { id: "lavador", label: "Lavador" },
    { id: "outros", label: "Outros" }
  ];

  const modules = [
    { id: "home_metas", label: "Widget: Metas (Situação)" },
    { id: "home_ranking", label: "Widget: Ranking Colaboradores" },
    { id: "home_tarefas", label: "Widget: Tarefas Pendentes" },
    { id: "home_tcmp2", label: "Widget: TCMP2 Tempo Real" },
    { id: "home_r70i30", label: "Widget: R70/I30 Tempo Real" },
    { id: "home_gps", label: "Widget: GPS Aplicados" },
    { id: "home_kit_master", label: "Widget: Kit Master Convertido" },
    { id: "home_pave", label: "Widget: PAVE Agendamento" }
  ];

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-setting-permissions'],
    queryFn: async () => {
      const result = await base44.entities.SystemSetting.filter({ key: 'permissions_config' });
      return result[0] || null;
    }
  });

  useEffect(() => {
    if (settings?.value) {
      try {
        setPermissions(JSON.parse(settings.value));
      } catch (e) {
        console.error("Erro ao parsear permissões:", e);
        setPermissions({});
      }
    } else {
      setPermissions({});
    }
  }, [settings]);

  const handleToggle = (roleId, moduleId) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: !prev[roleId]?.[moduleId]
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const value = JSON.stringify(permissions);
      
      if (settings) {
        await base44.entities.SystemSetting.update(settings.id, { value });
      } else {
        await base44.entities.SystemSetting.create({
          key: 'permissions_config',
          value,
          description: 'Configuração de visibilidade de módulos por cargo'
        });
      }
      
      await queryClient.invalidateQueries(['system-setting-permissions']);
      toast.success("Configurações da Tela Inicial atualizadas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (roleId) => {
    const allSelected = modules.every(m => permissions[roleId]?.[m.id]);
    const newRolePermissions = { ...(permissions[roleId] || {}) };
    
    modules.forEach(m => {
      newRolePermissions[m.id] = !allSelected;
    });
    
    setPermissions(prev => ({
      ...prev,
      [roleId]: newRolePermissions
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Configuração de Widgets da Home</h2>
          <p className="text-sm text-gray-600 mt-1">
            Defina quais widgets aparecem na Tela Inicial para cada cargo
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          <Tabs defaultValue={roles[0].id} className="w-full flex flex-col md:flex-row">
            <TabsList className="flex flex-col h-auto w-full md:w-64 bg-gray-50 p-2 justify-start space-y-1 rounded-none md:border-r md:min-h-[600px]">
              {roles.map((role) => (
                <TabsTrigger 
                  key={role.id} 
                  value={role.id}
                  className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-l-4 data-[state=active]:border-blue-600 rounded-r-md rounded-l-none"
                >
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="flex-1 p-6 bg-white">
              {roles.map((role) => (
                <TabsContent key={role.id} value={role.id} className="mt-0 space-y-6">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{role.label}</h3>
                      <p className="text-sm text-gray-500">Widgets visíveis na Home</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleSelectAll(role.id)}>
                      Selecionar Todos
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modules.map((module) => (
                      <div 
                        key={module.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                          permissions[role.id]?.[module.id] 
                            ? "bg-blue-50 border-blue-200 shadow-sm" 
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox 
                          id={`${role.id}-${module.id}`}
                          checked={permissions[role.id]?.[module.id] || false}
                          onCheckedChange={() => handleToggle(role.id, module.id)}
                          className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <label
                          htmlFor={`${role.id}-${module.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                        >
                          {module.label}
                        </label>
                        {permissions[role.id]?.[module.id] && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Informação:</p>
                    <p>Estes widgets aparecem nos cartões coloridos da página Home/Dashboard Inicial.</p>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
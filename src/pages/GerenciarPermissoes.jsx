import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function GerenciarPermissoes() {
  const queryClient = useQueryClient();
  const [permissionsSidebar, setPermissionsSidebar] = useState({});
  const [permissionsPortal, setPermissionsPortal] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("sidebar");

  // Lista de cargos do sistema (conforme User.json)
  const roles = [
    { id: "proprietario", label: "Proprietário" },
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

  // Módulos da Sidebar Principal
  const modulosSidebar = [
    { id: "dashboard", label: "Dashboard & Rankings" },
    { id: "cadastros", label: "Cadastros (Oficina)" },
    { id: "patio", label: "Pátio Operação (QGP)" },
    { id: "resultados", label: "Resultados & Finanças" },
    { id: "pessoas", label: "Pessoas & RH" },
    { id: "diagnosticos", label: "Diagnósticos & IA" },
    { id: "processos", label: "Processos" },
    { id: "documentos", label: "Documentos" },
    { id: "cultura", label: "Cultura" },
    { id: "treinamentos", label: "Treinamentos" }
  ];

  // Módulos do Portal do Colaborador
  const modulosPortal = [
    { id: "perfil", label: "Meu Perfil" },
    { id: "tarefas", label: "Minhas Tarefas" },
    { id: "equipe", label: "Minha Equipe" },
    { id: "financeiro", label: "Financeiro" },
    { id: "comercial", label: "Vendas & CRM" },
    { id: "metas", label: "Minhas Metas" },
    { id: "feedbacks", label: "Meus Feedbacks" },
    { id: "desempenho", label: "Desempenho" },
    { id: "documentos", label: "Documentos" },
    { id: "treinamentos", label: "Meus Treinamentos" },
    { id: "gamificacao", label: "Gamificação" },
    { id: "qgp", label: "QGP Pessoal" },
    { id: "estoque", label: "Estoque" },
    { id: "agenda", label: "Agenda" }
  ];

  // Carregar configurações atuais
  const { data: settingsSidebar, isLoading: isLoadingSidebar } = useQuery({
    queryKey: ['system-setting-permissions-sidebar'],
    queryFn: async () => {
      const result = await base44.entities.SystemSetting.filter({ key: 'permissions_config' });
      return result[0] || null;
    }
  });

  const { data: settingsPortal, isLoading: isLoadingPortal } = useQuery({
    queryKey: ['system-setting-permissions-portal'],
    queryFn: async () => {
      const result = await base44.entities.SystemSetting.filter({ key: 'permissions_config_portal' });
      return result[0] || null;
    }
  });

  useEffect(() => {
    // Carregar permissões da Sidebar
    if (settingsSidebar?.value) {
      try {
        setPermissionsSidebar(JSON.parse(settingsSidebar.value));
      } catch (e) {
        console.error("Erro ao parsear permissões sidebar:", e);
        setPermissionsSidebar({});
      }
    } else {
      setPermissionsSidebar({
        diretor: modulosSidebar.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
      });
    }

    // Carregar permissões do Portal
    if (settingsPortal?.value) {
      try {
        setPermissionsPortal(JSON.parse(settingsPortal.value));
      } catch (e) {
        console.error("Erro ao parsear permissões portal:", e);
        setPermissionsPortal({});
      }
    } else {
      setPermissionsPortal({
        diretor: modulosPortal.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
      });
    }
  }, [settingsSidebar, settingsPortal]);

  const handleToggle = (roleId, moduleId, isPortal = false) => {
    if (isPortal) {
      setPermissionsPortal(prev => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleId]: !prev[roleId]?.[moduleId]
        }
      }));
    } else {
      setPermissionsSidebar(prev => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleId]: !prev[roleId]?.[moduleId]
        }
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salvar permissões da Sidebar
      const valueSidebar = JSON.stringify(permissionsSidebar);
      if (settingsSidebar) {
        await base44.entities.SystemSetting.update(settingsSidebar.id, { value: valueSidebar });
      } else {
        await base44.entities.SystemSetting.create({
          key: 'permissions_config',
          value: valueSidebar,
          description: 'Configuração de visibilidade de módulos da Sidebar por cargo'
        });
      }

      // Salvar permissões do Portal
      const valuePortal = JSON.stringify(permissionsPortal);
      if (settingsPortal) {
        await base44.entities.SystemSetting.update(settingsPortal.id, { value: valuePortal });
      } else {
        await base44.entities.SystemSetting.create({
          key: 'permissions_config_portal',
          value: valuePortal,
          description: 'Configuração de visibilidade de módulos do Portal do Colaborador por cargo'
        });
      }
      
      await queryClient.invalidateQueries(['system-setting-permissions-sidebar']);
      await queryClient.invalidateQueries(['system-setting-permissions-portal']);
      toast.success("Permissões atualizadas com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAll = (roleId, isPortal = false) => {
    const currentModules = isPortal ? modulosPortal : modulosSidebar;
    const currentPermissions = isPortal ? permissionsPortal : permissionsSidebar;
    
    const allSelected = currentModules.every(m => currentPermissions[roleId]?.[m.id]);
    const newRolePermissions = {};
    currentModules.forEach(m => {
      newRolePermissions[m.id] = !allSelected;
    });
    
    if (isPortal) {
      setPermissionsPortal(prev => ({
        ...prev,
        [roleId]: newRolePermissions
      }));
    } else {
      setPermissionsSidebar(prev => ({
        ...prev,
        [roleId]: newRolePermissions
      }));
    }
  };

  if (isLoadingSidebar || isLoadingPortal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gerenciar Permissões
            </h1>
            <p className="text-gray-600 mt-1">
              Defina quais módulos cada cargo pode visualizar no sistema
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white shadow-sm">
            <TabsTrigger value="sidebar">Sidebar Principal</TabsTrigger>
            <TabsTrigger value="portal">Portal Colaborador</TabsTrigger>
          </TabsList>

          {/* Permissões da Sidebar */}
          <TabsContent value="sidebar">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-white border-b">
                <CardTitle>Matriz de Acesso - Sidebar Principal</CardTitle>
                <CardDescription>Controle quais módulos da sidebar cada cargo pode ver</CardDescription>
              </CardHeader>
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
                            <p className="text-sm text-gray-500">Módulos da Sidebar Principal</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleSelectAll(role.id, false)}>
                            Selecionar Todos
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modulosSidebar.map((module) => (
                            <div 
                              key={module.id}
                              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                                permissionsSidebar[role.id]?.[module.id] 
                                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <Checkbox 
                                id={`sidebar-${role.id}-${module.id}`}
                                checked={permissionsSidebar[role.id]?.[module.id] || false}
                                onCheckedChange={() => handleToggle(role.id, module.id, false)}
                                className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <label
                                htmlFor={`sidebar-${role.id}-${module.id}`}
                                className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                              >
                                {module.label}
                              </label>
                              {permissionsSidebar[role.id]?.[module.id] && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissões do Portal */}
          <TabsContent value="portal">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-white border-b">
                <CardTitle>Matriz de Acesso - Portal do Colaborador</CardTitle>
                <CardDescription>Controle o que cada cargo vê no Portal do Colaborador</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue={roles[0].id} className="w-full flex flex-col md:flex-row">
                  <TabsList className="flex flex-col h-auto w-full md:w-64 bg-gray-50 p-2 justify-start space-y-1 rounded-none md:border-r md:min-h-[600px]">
                    {roles.map((role) => (
                      <TabsTrigger 
                        key={role.id} 
                        value={role.id}
                        className="w-full justify-start px-4 py-3 text-left data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-l-4 data-[state=active]:border-green-600 rounded-r-md rounded-l-none"
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
                            <p className="text-sm text-gray-500">Módulos do Portal do Colaborador</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleSelectAll(role.id, true)}>
                            Selecionar Todos
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modulosPortal.map((module) => (
                            <div 
                              key={module.id}
                              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                                permissionsPortal[role.id]?.[module.id] 
                                  ? "bg-green-50 border-green-200 shadow-sm" 
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <Checkbox 
                                id={`portal-${role.id}-${module.id}`}
                                checked={permissionsPortal[role.id]?.[module.id] || false}
                                onCheckedChange={() => handleToggle(role.id, module.id, true)}
                                className="w-5 h-5 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <label
                                htmlFor={`portal-${role.id}-${module.id}`}
                                className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
                              >
                                {module.label}
                              </label>
                              {permissionsPortal[role.id]?.[module.id] && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                            <p className="font-semibold mb-1">Nota:</p>
                            <p>As alterações terão efeito na próxima vez que os colaboradores desse cargo recarregarem a página.</p>
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
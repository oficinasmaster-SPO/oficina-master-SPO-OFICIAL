import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Shield, Save, Users, Search, 
  Filter, TrendingUp, Award, Settings
} from "lucide-react";
import { toast } from "sonner";
import RoleCard from "../components/roles/RoleCard";
import PermissionMatrix from "../components/roles/PermissionMatrix";

export default function GestaoRoles() {
  const queryClient = useQueryClient();
  const [permissionsSidebar, setPermissionsSidebar] = useState({});
  const [permissionsPortal, setPermissionsPortal] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const roles = [
    { id: "diretor", label: "Diretor", level: "executive" },
    { id: "supervisor_loja", label: "Supervisor de Loja", level: "management" },
    { id: "gerente", label: "Gerente", level: "management" },
    { id: "lider_tecnico", label: "Líder Técnico", level: "coordination" },
    { id: "financeiro", label: "Financeiro", level: "specialist" },
    { id: "rh", label: "Recursos Humanos", level: "specialist" },
    { id: "tecnico", label: "Técnico", level: "operational" },
    { id: "funilaria_pintura", label: "Funilaria e Pintura", level: "operational" },
    { id: "comercial", label: "Comercial", level: "specialist" },
    { id: "consultor_vendas", label: "Consultor de Vendas", level: "specialist" },
    { id: "marketing", label: "Marketing", level: "specialist" },
    { id: "estoque", label: "Estoque", level: "operational" },
    { id: "administrativo", label: "Administrativo", level: "support" },
    { id: "motoboy", label: "Motoboy", level: "support" },
    { id: "lavador", label: "Lavador", level: "support" },
    { id: "outros", label: "Outros", level: "support" }
  ];

  const modulosSidebar = [
    { id: "dashboard", label: "Dashboard & Rankings", category: "gestao" },
    { id: "cadastros", label: "Cadastros (Oficina)", category: "administrativo" },
    { id: "patio", label: "Pátio Operação (QGP)", category: "operacional" },
    { id: "resultados", label: "Resultados & Finanças", category: "gestao" },
    { id: "pessoas", label: "Pessoas & RH", category: "gestao" },
    { id: "diagnosticos", label: "Diagnósticos & IA", category: "estrategico" },
    { id: "processos", label: "Processos", category: "operacional" },
    { id: "documentos", label: "Documentos", category: "administrativo" },
    { id: "cultura", label: "Cultura", category: "estrategico" },
    { id: "treinamentos", label: "Treinamentos", category: "desenvolvimento" }
  ];

  const modulosPortal = [
    { id: "perfil", label: "Meu Perfil", category: "basico" },
    { id: "tarefas", label: "Minhas Tarefas", category: "basico" },
    { id: "equipe", label: "Minha Equipe", category: "gestao" },
    { id: "financeiro", label: "Financeiro", category: "gestao" },
    { id: "comercial", label: "Vendas & CRM", category: "comercial" },
    { id: "metas", label: "Minhas Metas", category: "basico" },
    { id: "feedbacks", label: "Meus Feedbacks", category: "basico" },
    { id: "desempenho", label: "Desempenho", category: "desenvolvimento" },
    { id: "documentos", label: "Documentos", category: "basico" },
    { id: "treinamentos", label: "Meus Treinamentos", category: "desenvolvimento" },
    { id: "gamificacao", label: "Gamificação", category: "engajamento" },
    { id: "qgp", label: "QGP Pessoal", category: "operacional" },
    { id: "estoque", label: "Estoque", category: "operacional" },
    { id: "agenda", label: "Agenda", category: "basico" }
  ];

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

  const { data: employees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const result = await base44.entities.Employee.list();
      return Array.isArray(result) ? result : [];
    }
  });

  useEffect(() => {
    if (settingsSidebar?.value) {
      try {
        setPermissionsSidebar(JSON.parse(settingsSidebar.value));
      } catch (e) {
        console.error("Erro ao parsear permissões sidebar:", e);
        setPermissionsSidebar({});
      }
    } else {
      const defaultPermissions = {};
      roles.forEach(role => {
        defaultPermissions[role.id] = modulosSidebar.reduce((acc, mod) => ({ 
          ...acc, 
          [mod.id]: role.level === 'executive' || role.level === 'management' 
        }), {});
      });
      setPermissionsSidebar(defaultPermissions);
    }

    if (settingsPortal?.value) {
      try {
        setPermissionsPortal(JSON.parse(settingsPortal.value));
      } catch (e) {
        console.error("Erro ao parsear permissões portal:", e);
        setPermissionsPortal({});
      }
    } else {
      const defaultPermissions = {};
      roles.forEach(role => {
        defaultPermissions[role.id] = modulosPortal.reduce((acc, mod) => ({ 
          ...acc, 
          [mod.id]: ['perfil', 'tarefas', 'metas', 'feedbacks', 'documentos'].includes(mod.id)
        }), {});
      });
      setPermissionsPortal(defaultPermissions);
    }
  }, [settingsSidebar, settingsPortal]);

  const handleToggleSidebar = (roleId, moduleId) => {
    setPermissionsSidebar(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: !prev[roleId]?.[moduleId]
      }
    }));
  };

  const handleTogglePortal = (roleId, moduleId) => {
    setPermissionsPortal(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: !prev[roleId]?.[moduleId]
      }
    }));
  };

  const handleSelectAllSidebar = (roleId) => {
    const allSelected = modulosSidebar.every(m => permissionsSidebar[roleId]?.[m.id]);
    const newRolePermissions = {};
    modulosSidebar.forEach(m => {
      newRolePermissions[m.id] = !allSelected;
    });
    
    setPermissionsSidebar(prev => ({
      ...prev,
      [roleId]: newRolePermissions
    }));
  };

  const handleSelectAllPortal = (roleId) => {
    const allSelected = modulosPortal.every(m => permissionsPortal[roleId]?.[m.id]);
    const newRolePermissions = {};
    modulosPortal.forEach(m => {
      newRolePermissions[m.id] = !allSelected;
    });
    
    setPermissionsPortal(prev => ({
      ...prev,
      [roleId]: newRolePermissions
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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
      toast.success("Permissões atualizadas com sucesso! As alterações terão efeito no próximo login dos colaboradores.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setIsSaving(false);
    }
  };

  const getEmployeeCountByRole = (roleId) => {
    return employees.filter(emp => emp.job_role === roleId && emp.status === 'ativo').length;
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterActive === "all" || role.level === filterActive;
    return matchesSearch && matchesFilter;
  });

  if (isLoadingSidebar || isLoadingPortal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Gestão de Roles e Permissões
            </h1>
            <p className="text-gray-600 mt-1">
              Controle completo de acesso e permissões por cargo
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
            size="lg"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total de Cargos</p>
                  <p className="text-3xl font-bold">{roles.length}</p>
                </div>
                <Shield className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Colaboradores</p>
                  <p className="text-3xl font-bold">{employees.length}</p>
                </div>
                <Users className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Módulos Sidebar</p>
                  <p className="text-3xl font-bold">{modulosSidebar.length}</p>
                </div>
                <Settings className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Módulos Portal</p>
                  <p className="text-3xl font-bold">{modulosPortal.length}</p>
                </div>
                <Award className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterActive === "all" ? "default" : "outline"}
                  onClick={() => setFilterActive("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={filterActive === "executive" ? "default" : "outline"}
                  onClick={() => setFilterActive("executive")}
                >
                  Executivo
                </Button>
                <Button
                  variant={filterActive === "management" ? "default" : "outline"}
                  onClick={() => setFilterActive("management")}
                >
                  Gestão
                </Button>
                <Button
                  variant={filterActive === "operational" ? "default" : "outline"}
                  onClick={() => setFilterActive("operational")}
                >
                  Operacional
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Cards */}
        {!selectedRole && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {filteredRoles.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                employeeCount={getEmployeeCountByRole(role.id)}
                onClick={() => setSelectedRole(role)}
              />
            ))}
          </div>
        )}

        {/* Permission Matrix */}
        {selectedRole && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" onClick={() => setSelectedRole(null)}>
                ← Voltar
              </Button>
              <Badge variant="outline" className="text-lg py-1 px-3">
                {selectedRole.label}
              </Badge>
            </div>

            <Tabs defaultValue="sidebar" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="sidebar">Sidebar Principal</TabsTrigger>
                <TabsTrigger value="portal">Portal Colaborador</TabsTrigger>
              </TabsList>

              <TabsContent value="sidebar">
                <PermissionMatrix
                  role={selectedRole}
                  modules={modulosSidebar}
                  permissions={permissionsSidebar}
                  onToggle={handleToggleSidebar}
                  onSelectAll={handleSelectAllSidebar}
                  type="sidebar"
                />
              </TabsContent>

              <TabsContent value="portal">
                <PermissionMatrix
                  role={selectedRole}
                  modules={modulosPortal}
                  permissions={permissionsPortal}
                  onToggle={handleTogglePortal}
                  onSelectAll={handleSelectAllPortal}
                  type="portal"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Shield, Search, Eye, AlertTriangle, CheckCircle2, Lock, Users, Building2, UserCheck } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";
import { toast } from "sonner";
import UserPermissionsEditor from "./UserPermissionsEditor";

export default function UserPermissionsViewer() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const data = await base44.entities.User.list();
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees"],
    queryFn: async () => {
      const data = await base44.asServiceRole.entities.Employee.list();
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const data = await base44.entities.UserProfile.list();
      return data || [];
    },
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const data = await base44.entities.CustomRole.list();
      return data || [];
    },
  });

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);
  
  const handleImpersonate = async (userId, userEmail) => {
    try {
      await base44.functions.invoke('impersonateUser', { target_user_id: userId });
      toast.success(`Você está visualizando como: ${userEmail}`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error("Erro ao impersonar usuário: " + error.message);
    }
  };

  const getUserPermissionsSummary = (user) => {
    if (!user) return null;

    // Admin tem todas as permissões
    if (user.role === 'admin') {
      return {
        profileName: "Administrador do Sistema",
        allRoles: systemRoles.flatMap(m => m.roles.map(r => r.id)),
        customRoles: [],
        jobRoles: [],
        modules: "Todos os módulos",
        isAdmin: true
      };
    }

    // Tentar encontrar Employee vinculado para obter profile_id correto
    const employee = employees.find(emp => emp.user_id === user.id);
    const profileIdToUse = employee?.profile_id || user.profile_id;

    // Buscar perfil do usuário
    const userProfile = profiles.find(p => p.id === profileIdToUse);
    
    // Buscar custom roles
    const userCustomRoles = customRoles.filter(cr => 
      (user.custom_role_id && cr.id === user.custom_role_id) ||
      (userProfile?.custom_role_ids && userProfile.custom_role_ids.includes(cr.id))
    );

    return {
      profileName: userProfile?.name || "Sem perfil definido",
      profileType: userProfile?.type || "N/A",
      allRoles: userProfile?.roles || [],
      customRoles: userCustomRoles,
      jobRoles: userProfile?.job_roles || [],
      modules: userProfile?.modules_allowed || [],
      modulePermissions: userProfile?.module_permissions || {},
      sidebarPermissions: userProfile?.sidebar_permissions || {},
      isAdmin: false
    };
  };

  const summary = getUserPermissionsSummary(selectedUser);

  // Classificar usuários em internos / externos
  const internalUsers = users.filter(u => {
    if (u.role === 'admin') return true;
    const emp = employees.find(e => e.user_id === u.id);
    return emp?.tipo_vinculo === 'interno' || emp?.is_internal === true || emp?.job_role === 'socio' || emp?.job_role === 'socio_interno';
  });
  const externalUsers = users.filter(u => !internalUsers.includes(u));

  return (
    <div className="space-y-6">
      {/* Listagem agrupada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Internos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-blue-600" />
              Usuários Internos
              <Badge className="ml-auto bg-blue-100 text-blue-800">{internalUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {internalUsers.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Nenhum usuário interno</p>
              ) : internalUsers.map(u => {
                const emp = employees.find(e => e.user_id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedUserId === u.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    {u.role === 'admin' ? (
                      <Badge className="bg-red-100 text-red-700 text-xs flex-shrink-0">Admin</Badge>
                    ) : emp?.position ? (
                      <span className="text-xs text-gray-400 flex-shrink-0 max-w-[80px] truncate">{emp.position}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Externos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="w-4 h-4 text-green-600" />
              Usuários Externos / Clientes
              <Badge className="ml-auto bg-green-100 text-green-800">{externalUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {externalUsers.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">Nenhum usuário externo</p>
              ) : externalUsers.map(u => {
                const emp = employees.find(e => e.user_id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selectedUserId === u.id ? 'bg-green-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    {emp?.position && (
                      <span className="text-xs text-gray-400 flex-shrink-0 max-w-[80px] truncate">{emp.position}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Pesquisar Usuário
          </CardTitle>
          <CardDescription>
            Busque por email ou nome para visualizar as permissões consolidadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Digite email ou nome do usuário..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setSearchEmail("")}>
              Limpar
            </Button>
          </div>

          {searchEmail && (
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedUserId === user.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        {user.role === 'admin' && (
                          <Badge className="bg-red-100 text-red-700">Admin</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Permissões de {selectedUser.full_name || selectedUser.email}
                </CardTitle>
                <CardDescription className="mt-1">
                  Relatório consolidado de perfis, roles e acessos
                </CardDescription>
              </div>
              <Button
                onClick={() => handleImpersonate(selectedUser.id, selectedUser.email)}
                variant="outline"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Impersonar Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <UserPermissionsEditor
              user={selectedUser}
              employees={employees}
              profiles={profiles}
              customRoles={customRoles}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
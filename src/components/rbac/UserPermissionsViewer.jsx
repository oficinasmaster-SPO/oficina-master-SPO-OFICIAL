import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Shield, Search, Eye, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";
import { toast } from "sonner";

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

    // Buscar perfil do usuário
    const userProfile = profiles.find(p => p.id === user.profile_id);
    
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

  return (
    <div className="space-y-6">
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
            {summary.isAdmin ? (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Administrador do Sistema:</strong> Este usuário tem acesso total e irrestrito a todas as funcionalidades, dados e configurações da plataforma.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Perfil Principal */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    Perfil Principal
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Nome:</span>
                      <Badge variant="outline" className="bg-white">
                        {summary.profileName}
                      </Badge>
                    </div>
                    {summary.profileType && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Tipo:</span>
                        <Badge variant="outline" className="bg-white">
                          {summary.profileType === 'interno' ? 'Interno' : 'Externo'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Roles */}
                {summary.jobRoles.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Funções Vinculadas ({summary.jobRoles.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.jobRoles.map((jr) => (
                        <Badge key={jr} variant="outline" className="bg-blue-50">
                          {jr}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Roles */}
                {summary.allRoles.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Permissões do Sistema ({summary.allRoles.length})
                    </h3>
                    <div className="space-y-4">
                      {systemRoles.map((module) => {
                        const moduleRoles = module.roles.filter(r => 
                          summary.allRoles.includes(r.id)
                        );
                        
                        if (moduleRoles.length === 0) return null;

                        const Icon = module.icon;
                        return (
                          <div key={module.id} className="pl-4 border-l-2 border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-purple-600" />
                              <h4 className="font-medium text-gray-800">{module.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {moduleRoles.length} permissões
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {moduleRoles.map((role) => (
                                <div key={role.id} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-700">{role.name}</p>
                                    <p className="text-xs text-gray-500">{role.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Roles */}
                {summary.customRoles.length > 0 && (
                  <div className="border rounded-lg p-4 bg-amber-50">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Roles Customizadas ({summary.customRoles.length})
                    </h3>
                    <div className="space-y-2">
                      {summary.customRoles.map((cr) => (
                        <div key={cr.id} className="bg-white p-3 rounded border">
                          <p className="font-medium text-gray-900">{cr.name}</p>
                          {cr.description && (
                            <p className="text-sm text-gray-600 mt-1">{cr.description}</p>
                          )}
                          {cr.system_roles && cr.system_roles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {cr.system_roles.slice(0, 5).map((roleId) => (
                                <Badge key={roleId} variant="outline" className="text-xs">
                                  {roleId}
                                </Badge>
                              ))}
                              {cr.system_roles.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{cr.system_roles.length - 5} mais
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Módulos Permitidos */}
                {Array.isArray(summary.modules) && summary.modules.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Módulos/Páginas Acessíveis ({summary.modules.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.modules.map((mod) => (
                        <Badge key={mod} variant="outline" className="bg-green-50">
                          {mod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sem Permissões */}
                {summary.allRoles.length === 0 && summary.customRoles.length === 0 && (
                  <Alert>
                    <Lock className="w-4 h-4" />
                    <AlertDescription>
                      Este usuário não possui permissões configuradas. Configure um perfil ou role customizada para liberar acessos.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Eye, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PermissionPreview({ permissions = {}, jobRoles = [] }) {
  const [selectedRole, setSelectedRole] = useState(jobRoles[0]?.value || null);

  const getRolePermissions = (roleId) => {
    return permissions[roleId] || {};
  };

  const getResourcePermissions = (roleId, resourceId) => {
    return permissions[roleId]?.[resourceId] || {};
  };

  const getModuleAccess = (roleId, moduleId) => {
    return permissions[roleId]?.modules?.[moduleId] || "bloqueado";
  };

  const countTotalPermissions = (roleId) => {
    if (!roleId || !permissions || !permissions[roleId]) return 0;
    const rolePerms = permissions[roleId];
    let count = 0;
    
    try {
      Object.keys(rolePerms).forEach(key => {
        if (key !== 'modules' && typeof rolePerms[key] === 'object' && rolePerms[key]) {
          const resource = rolePerms[key];
          count += Object.values(resource).filter(Boolean).length;
        }
      });
    } catch (error) {
      console.error("Erro ao contar permissões:", error);
    }
    
    return count;
  };

  const getAccessLevelBadge = (level) => {
    const colors = {
      total: "bg-green-100 text-green-700",
      visualizacao: "bg-blue-100 text-blue-700",
      bloqueado: "bg-red-100 text-red-700"
    };
    
    const labels = {
      total: "Total",
      visualizacao: "Visualização",
      bloqueado: "Bloqueado"
    };
    
    return (
      <Badge className={colors[level] || colors.bloqueado}>
        {labels[level] || "Bloqueado"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Cargos Configurados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {permissions ? Object.keys(permissions).length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Permissões Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {permissions ? Object.keys(permissions).reduce((sum, role) => sum + countTotalPermissions(role), 0) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Módulos Configurados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {permissions ? Object.keys(permissions).reduce((sum, role) => {
                    const modules = permissions[role]?.modules;
                    return sum + (modules ? Object.keys(modules).length : 0);
                  }, 0) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Visualizar Permissões por Cargo</CardTitle>
        </CardHeader>
        <CardContent>
          {jobRoles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum cargo configurado ainda.</p>
            </div>
          ) : (
            <Tabs value={selectedRole || ''} onValueChange={setSelectedRole}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-6">
                {jobRoles.map((role) => (
                  <TabsTrigger key={role.value} value={role.value}>
                    {role.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {jobRoles.map((role) => {
                const rolePerms = getRolePermissions(role.value);
                const hasResourcePerms = Object.keys(rolePerms).filter(k => k !== 'modules').length > 0;
                const hasModulePerms = rolePerms.modules && Object.keys(rolePerms.modules).length > 0;
                
                return (
                  <TabsContent key={role.value} value={role.value}>
                    <div className="space-y-6">
                      {/* Resource Permissions */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Permissões CRUD por Recurso
                        </h3>
                        {!hasResourcePerms ? (
                          <p className="text-sm text-gray-500 text-center py-8">
                            Nenhuma permissão de recurso configurada para este cargo.
                          </p>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4">
                            {Object.keys(rolePerms)
                              .filter(key => key !== 'modules')
                              .map((resourceId) => {
                                const resourcePerms = getResourcePermissions(role.value, resourceId);
                                
                                return (
                                  <Card key={resourceId} className="border-2">
                                    <CardContent className="p-4">
                                      <h4 className="font-medium text-gray-900 capitalize mb-3">
                                        {resourceId}
                                      </h4>
                                      <div className="grid grid-cols-2 gap-2">
                                        {['create', 'read', 'update', 'delete'].map((action) => (
                                          <div
                                            key={action}
                                            className={cn(
                                              "flex items-center gap-2 p-2 rounded text-sm",
                                              resourcePerms[action]
                                                ? "bg-green-50 text-green-700"
                                                : "bg-gray-50 text-gray-500"
                                            )}
                                          >
                                            {resourcePerms[action] ? (
                                              <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                              <XCircle className="w-4 h-4" />
                                            )}
                                            <span className="capitalize">{action}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {/* Module Access */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Acesso por Módulo
                        </h3>
                        {!hasModulePerms ? (
                          <p className="text-sm text-gray-500 text-center py-8">
                            Nenhuma permissão de módulo configurada para este cargo.
                          </p>
                        ) : (
                          <div className="grid md:grid-cols-3 gap-3">
                            {Object.entries(rolePerms.modules).map(([moduleId, level]) => (
                              <Card key={moduleId} className="border-2">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 capitalize text-sm">
                                      {moduleId}
                                    </span>
                                    {getAccessLevelBadge(level)}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
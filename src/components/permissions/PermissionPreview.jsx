import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Eye, Users, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function PermissionPreview({ permissions = {}, jobRoles = [] }) {
  const [selectedRole, setSelectedRole] = useState(jobRoles[0]?.value || null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" ou "list"

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

      {/* Role Selector - Modo Cartões Selecionáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Permissões por Cargo</span>
            <Badge variant="outline" className="font-normal">
              {Object.keys(permissions).length} cargo(s) configurado(s)
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Clique em um cargo para visualizar suas permissões detalhadas
          </p>
        </CardHeader>
        <CardContent>
          {jobRoles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum cargo configurado ainda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid de Seleção de Cargos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobRoles.map((role) => {
                  const isSelected = selectedRole === role.value;
                  const totalPerms = countTotalPermissions(role.value);
                  const rolePerms = getRolePermissions(role.value);
                  const moduleCount = rolePerms.modules ? Object.keys(rolePerms.modules).length : 0;
                  
                  return (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left hover:shadow-md",
                        isSelected 
                          ? "border-blue-500 bg-blue-50 shadow-md" 
                          : "border-gray-200 hover:border-blue-300 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className={cn(
                              "w-5 h-5 flex-shrink-0",
                              isSelected ? "text-blue-600" : "text-gray-400"
                            )} />
                            <h3 className={cn(
                              "font-semibold truncate",
                              isSelected ? "text-blue-900" : "text-gray-900"
                            )}>
                              {role.label}
                            </h3>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span className="text-gray-600">
                                {totalPerms} permissões ativas
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Eye className="w-3 h-3 text-purple-600" />
                              <span className="text-gray-600">
                                {moduleCount} módulos configurados
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          "w-5 h-5 flex-shrink-0 transition-transform",
                          isSelected ? "text-blue-600 transform rotate-90" : "text-gray-400"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalhes do Cargo Selecionado */}
              {selectedRole && (
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Detalhes: {jobRoles.find(r => r.value === selectedRole)?.label}
                    </h3>
                  </div>
                  
                  {(() => {
                    const rolePerms = getRolePermissions(selectedRole);
                    const hasResourcePerms = Object.keys(rolePerms).filter(k => k !== 'modules').length > 0;
                    const hasModulePerms = rolePerms.modules && Object.keys(rolePerms.modules).length > 0;
                    
                    return (
                      <div className="space-y-6")

                        {/* Resource Permissions */}
                        <div className="bg-gray-50 rounded-lg p-5">
                          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Permissões CRUD por Recurso
                          </h4>
                          {!hasResourcePerms ? (
                            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                              Nenhuma permissão de recurso configurada para este cargo.
                            </p>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.keys(rolePerms)
                                .filter(key => key !== 'modules')
                                .map((resourceId) => {
                                  const resourcePerms = getResourcePermissions(selectedRole, resourceId);
                                  const activePerms = Object.values(resourcePerms).filter(Boolean).length;
                                  
                                  return (
                                    <Card key={resourceId} className="border hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-semibold text-gray-900 capitalize text-sm">
                                            {resourceId}
                                          </h5>
                                          <Badge variant="outline" className="text-xs">
                                            {activePerms}/4
                                          </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {['create', 'read', 'update', 'delete'].map((action) => (
                                            <div
                                              key={action}
                                              className={cn(
                                                "flex items-center gap-1.5 p-2 rounded text-xs font-medium transition-colors",
                                                resourcePerms[action]
                                                  ? "bg-green-100 text-green-800 border border-green-200"
                                                  : "bg-gray-100 text-gray-500 border border-gray-200"
                                              )}
                                            >
                                              {resourcePerms[action] ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                              ) : (
                                                <XCircle className="w-3.5 h-3.5" />
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
                        <div className="bg-gray-50 rounded-lg p-5">
                          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Eye className="w-5 h-5 text-purple-600" />
                            Acesso por Módulo do Sistema
                          </h4>
                          {!hasModulePerms ? (
                            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                              Nenhuma permissão de módulo configurada para este cargo.
                            </p>
                          ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                              {Object.entries(rolePerms.modules).map(([moduleId, level]) => (
                                <Card key={moduleId} className="border hover:shadow-md transition-shadow">
                                  <CardContent className="p-3">
                                    <div className="space-y-2">
                                      <span className="font-medium text-gray-900 capitalize text-sm block truncate">
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
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
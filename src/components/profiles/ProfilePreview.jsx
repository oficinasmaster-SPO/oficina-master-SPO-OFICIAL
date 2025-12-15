import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { sidebarStructure } from "@/lib/sidebarStructure";

export default function ProfilePreview({ profile, onBack }) {
  const sidebarPerms = profile.sidebar_permissions || {};
  const modulePerms = profile.module_permissions || {};

  const getPermissionIcon = (hasPermission) => {
    return hasPermission ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-300" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pré-visualização: {profile.name}
          </h1>
          <p className="text-gray-600 mt-1">
            Visão de como o sistema aparecerá para usuários com este perfil
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso aos Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(modulePerms).map(([moduleId, access]) => {
              const moduleName =
                sidebarStructure.find((s) => s.id === moduleId)?.label ||
                moduleId;
              return (
                <div
                  key={moduleId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="text-sm font-medium">{moduleName}</span>
                  <Badge
                    variant={
                      access === "total"
                        ? "default"
                        : access === "visualizacao"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {access === "total"
                      ? "Total"
                      : access === "visualizacao"
                      ? "Visualização"
                      : "Bloqueado"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menu Sidebar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sidebarStructure.map((group) => {
              const hasAnyPermission = group.items.some((item) => {
                const itemKey = `${group.id}_${item.name}`;
                return sidebarPerms[itemKey]?.view;
              });

              if (!hasAnyPermission) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    {group.label}
                  </h3>
                  <div className="space-y-2 pl-4">
                    {group.items.map((item) => {
                      const itemKey = `${group.id}_${item.name}`;
                      const itemPerms = sidebarPerms[itemKey] || {};

                      if (!itemPerms.view) return null;

                      return (
                        <div
                          key={itemKey}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          {getPermissionIcon(itemPerms.view)}
                          <span className="text-sm flex-1">{item.name}</span>
                          <div className="flex gap-2">
                            {itemPerms.edit && (
                              <Badge variant="outline" className="text-xs">
                                Editar
                              </Badge>
                            )}
                            {itemPerms.create && (
                              <Badge variant="outline" className="text-xs">
                                Criar
                              </Badge>
                            )}
                            {itemPerms.delete && (
                              <Badge variant="outline" className="text-xs">
                                Excluir
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
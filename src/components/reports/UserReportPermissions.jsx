import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function UserReportPermissions({ userData, filters }) {
  const { user, permissions, activityLogs } = userData;

  // Tentativas de acesso negadas
  const deniedAttempts = activityLogs.filter(log => 
    log.action_type === 'access_denied' || log.details?.includes('negado')
  );

  // Agrupar permissões por módulo
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) {
      acc[perm.module_name] = [];
    }
    acc[perm.module_name].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Resumo de Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Perfil de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Perfil Atual</p>
                <p className="text-xs text-slate-500 mt-1">
                  {user.full_name || user.email}
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-700 capitalize">
                {user.role || 'user'}
              </Badge>
            </div>

            {user.job_role && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Função</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cargo no sistema
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {user.job_role}
                </Badge>
              </div>
            )}

            {user.area && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Área</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Departamento
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {user.area}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissões por Módulo */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões Ativas por Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.keys(permissionsByModule).length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Lock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma permissão específica configurada</p>
                <p className="text-xs mt-1">Usando permissões padrão do perfil</p>
              </div>
            ) : (
              Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3 capitalize">{module}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {perms.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {perm.can_view && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs">Ver</span>
                          </div>
                        )}
                        {perm.can_create && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs">Criar</span>
                          </div>
                        )}
                        {perm.can_edit && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs">Editar</span>
                          </div>
                        )}
                        {perm.can_delete && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs">Excluir</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tentativas de Acesso Negadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Tentativas de Acesso Negadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deniedAttempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p>Nenhuma tentativa de acesso negada</p>
              <p className="text-xs mt-1">Usuário respeitou todas as permissões</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deniedAttempts.map((attempt, idx) => (
                <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {attempt.page_name || 'Página desconhecida'}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {attempt.details || 'Acesso negado'}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(attempt.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
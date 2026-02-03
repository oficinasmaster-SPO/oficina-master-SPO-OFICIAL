import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Check, X, AlertCircle, Download, User, Briefcase } from "lucide-react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { PERMISSIONS_MAP, INTERNAL_ONLY_PAGES } from "@/components/lib/permissionsMap";
import { isInternalUser } from "@/components/utils/rbacHelpers";
import { toast } from "sonner";

export default function RBACDiagnostico() {
  const { user, profile, permissions, loading } = usePermissions();
  const [employee, setEmployee] = useState(null);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadEmployee();
    }
  }, [user?.id]);

  const loadEmployee = async () => {
    try {
      const employees = await base44.entities.Employee.filter({ user_id: user.id });
      setEmployee(employees?.[0] || null);
    } catch (error) {
      console.error("Erro ao carregar employee:", error);
    }
  };

  const runDiagnostic = async () => {
    setAnalyzing(true);
    try {
      const report = {
        timestamp: new Date().toISOString(),
        user: {
          email: user?.email,
          role: user?.role,
          is_internal: user?.is_internal,
        },
        employee: {
          name: employee?.full_name,
          job_role: employee?.job_role,
          is_internal: employee?.is_internal,
          tipo_vinculo: employee?.tipo_vinculo,
          area: employee?.area,
        },
        profile: {
          name: profile?.name,
          type: profile?.type,
          permission_type: profile?.permission_type,
          job_roles: profile?.job_roles || [],
        },
        permissions: {
          total: permissions.length,
          list: permissions,
        },
        internalCheck: {
          isInternalUser: isInternalUser(user, employee),
          userIsInternal: user?.is_internal,
          employeeIsInternal: employee?.is_internal,
          tipoVinculo: employee?.tipo_vinculo
        },
        pageAccess: {},
        issues: [],
      };

      // Verificar acesso a cada página
      const allPages = Object.keys(PERMISSIONS_MAP);
      for (const pageName of allPages) {
        const requiredPermission = PERMISSIONS_MAP[pageName];
        const isInternal = INTERNAL_ONLY_PAGES.includes(pageName);
        const hasPermission = permissions.includes(requiredPermission);
        const userIsInternal = isInternalUser(user, employee);

        const canAccess = user?.role === 'admin' || 
                         (hasPermission && (!isInternal || userIsInternal));

        report.pageAccess[pageName] = {
          requiredPermission,
          hasPermission,
          isInternalOnlyPage: isInternal,
          userIsInternal,
          canAccess,
        };

        // Detectar inconsistências
        if (hasPermission && !canAccess) {
          report.issues.push({
            page: pageName,
            issue: 'Tem permissão mas está bloqueado',
            reason: isInternal && !userIsInternal ? 'Página requer usuário interno' : 'Desconhecido',
          });
        }

        if (!hasPermission && isInternal && userIsInternal) {
          report.issues.push({
            page: pageName,
            issue: 'É interno mas não tem permissão',
            reason: `Falta permissão: ${requiredPermission}`,
          });
        }
      }

      setDiagnosticData(report);
      toast.success('Diagnóstico concluído');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setAnalyzing(false);
    }
  };

  const exportReport = () => {
    const dataStr = JSON.stringify(diagnosticData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbac-diagnostic-${new Date().toISOString()}.json`;
    a.click();
    toast.success('Relatório exportado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Diagnóstico RBAC
          </h1>
          <p className="text-gray-600 mt-2">
            Verificação completa de permissões e acesso do usuário atual
          </p>
        </div>
        <div className="flex gap-3">
          {diagnosticData && (
            <Button onClick={exportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON
            </Button>
          )}
          <Button 
            onClick={runDiagnostic} 
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
            ) : (
              <>Executar Diagnóstico</>
            )}
          </Button>
        </div>
      </div>

      {/* User Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{user?.email}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge className="bg-blue-600">{user?.role}</Badge>
              {user?.is_internal && (
                <Badge className="bg-purple-100 text-purple-700">User Interno</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {employee && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{employee.full_name}</p>
              <p className="text-sm text-gray-600">{employee.position}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge>{employee.job_role}</Badge>
                {employee.area && <Badge variant="outline">{employee.area}</Badge>}
                {employee.is_internal && (
                  <Badge className="bg-green-100 text-green-700">Employee Interno</Badge>
                )}
                {employee.tipo_vinculo === 'interno' && (
                  <Badge className="bg-green-100 text-green-700">Vínculo Interno</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{profile.name}</p>
              <Badge className="mt-2">{profile.type}</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Interno */}
      {diagnosticData?.internalCheck && (
        <Card className={diagnosticData.internalCheck.isInternalUser ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {diagnosticData.internalCheck.isInternalUser ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              Status de Usuário Interno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600">Resultado Final</p>
                <Badge className={diagnosticData.internalCheck.isInternalUser ? 'bg-green-600' : 'bg-red-600'}>
                  {diagnosticData.internalCheck.isInternalUser ? 'É Interno' : 'Não é Interno'}
                </Badge>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600">User.is_internal</p>
                <Badge variant={diagnosticData.internalCheck.userIsInternal ? 'default' : 'outline'}>
                  {diagnosticData.internalCheck.userIsInternal ? 'true' : 'false'}
                </Badge>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600">Employee.is_internal</p>
                <Badge variant={diagnosticData.internalCheck.employeeIsInternal ? 'default' : 'outline'}>
                  {diagnosticData.internalCheck.employeeIsInternal ? 'true' : 'false'}
                </Badge>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-600">tipo_vinculo</p>
                <Badge variant="outline">
                  {diagnosticData.internalCheck.tipoVinculo || 'null'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões Ativas ({permissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
            {permissions.map((perm, idx) => (
              <div key={idx} className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {perm}
              </div>
            ))}
            {permissions.length === 0 && (
              <p className="text-gray-500 col-span-4">Nenhuma permissão configurada</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagnóstico de Acesso */}
      {diagnosticData && (
        <>
          {diagnosticData.issues.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertCircle className="w-5 h-5" />
                  Problemas Detectados ({diagnosticData.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnosticData.issues.map((issue, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-red-200">
                      <p className="font-medium text-red-900">{issue.page}</p>
                      <p className="text-sm text-red-700">{issue.issue}</p>
                      <p className="text-xs text-gray-600 mt-1">Motivo: {issue.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Acesso a Páginas ({Object.keys(diagnosticData.pageAccess).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(diagnosticData.pageAccess).map(([pageName, access]) => (
                  <div 
                    key={pageName} 
                    className={`p-3 rounded-lg border ${access.canAccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {access.canAccess ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{pageName}</p>
                          <p className="text-xs text-gray-600">
                            Permissão: <code>{access.requiredPermission}</code>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {access.hasPermission && (
                          <Badge className="bg-green-100 text-green-700">Tem permissão</Badge>
                        )}
                        {access.isInternalOnlyPage && (
                          <Badge variant="outline">Requer Interno</Badge>
                        )}
                        {access.userIsInternal && (
                          <Badge className="bg-purple-100 text-purple-700">É Interno</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
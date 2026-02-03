import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Check, X, AlertCircle, Download } from "lucide-react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { PERMISSIONS_MAP, INTERNAL_ONLY_PAGES } from "@/components/lib/permissionsMap";
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
        pageAccess: {},
        issues: [],
      };

      // Verificar acesso a cada página
      const allPages = Object.keys(PERMISSIONS_MAP);
      for (const pageName of allPages) {
        const requiredPermission = PERMISSIONS_MAP[pageName];
        const isInternal = INTERNAL_ONLY_PAGES.includes(pageName);
        const hasPermission = permissions.includes(requiredPermission);
        const isInternalUser = user?.is_internal || employee?.is_internal;

        const canAccess = user?.role === 'admin' || 
                         (hasPermission && (!isInternal || isInternalUser));

        report.pageAccess[pageName] = {
          requiredPermission,
          hasPermission,
          isInternal,
          isInternalUser,
          canAccess,
        };

        // Detectar inconsistências
        if (hasPermission && !canAccess) {
          report.issues.push({
            page: pageName,
            issue: 'Tem permissão mas está bloqueado',
            reason: isInternal && !isInternalUser ? 'Não é usuário interno' : 'Desconhecido',
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
            <CardTitle className="text-sm">Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{user?.email}</p>
            <Badge className="mt-2">{user?.role}</Badge>
            {user?.is_internal && (
              <Badge className="mt-2 ml-2 bg-purple-100 text-purple-700">Interno</Badge>
            )}
          </CardContent>
        </Card>

        {employee && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{employee.full_name}</p>
              <p className="text-sm text-gray-600">{employee.position}</p>
              <div className="mt-2 flex gap-2">
                <Badge>{employee.job_role}</Badge>
                {employee.area && <Badge variant="outline">{employee.area}</Badge>}
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
                      <div className="flex gap-2">
                        {access.hasPermission && (
                          <Badge className="bg-green-100 text-green-700">Tem permissão</Badge>
                        )}
                        {access.isInternal && (
                          <Badge variant="outline">Requer Interno</Badge>
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
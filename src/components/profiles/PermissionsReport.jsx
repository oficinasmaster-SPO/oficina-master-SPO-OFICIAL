import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, CheckCircle, FileText, Download, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ModuleDistributionChart, CoverageChart, RoleAnalyticsChart } from "./reports/PermissionCharts";
import ReportFilters from "./reports/ReportFilters";

export default function PermissionsReport({ profile }) {
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState(profile?.id || null);
  const [selectedRole, setSelectedRole] = React.useState(null);

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: allCustomRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const generateReport = async (profileId = null) => {
    try {
      setLoading(true);
      const targetProfileId = profileId || selectedProfile || profile.id;
      const result = await base44.functions.invoke("generatePermissionsReport", {
        profile_id: targetProfileId,
      });
      setReport(result.data.report);
      toast.success("Relatório gerado com sucesso");
    } catch (error) {
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (profileId) => {
    setSelectedProfile(profileId);
    if (profileId) {
      generateReport(profileId);
    }
  };

  const handleRoleFilter = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleClearFilters = () => {
    setSelectedProfile(profile.id);
    setSelectedRole(null);
    generateReport(profile.id);
  };

  const filteredReport = React.useMemo(() => {
    if (!report || !selectedRole) return report;
    
    return {
      ...report,
      custom_roles: report.custom_roles.filter(r => r.id === selectedRole),
      role_analytics: report.role_analytics.filter(r => r.role_id === selectedRole)
    };
  }, [report, selectedRole]);

  const downloadReport = () => {
    const json = JSON.stringify(displayReport, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permissoes-${displayReport.profile.name}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayReport = filteredReport || report;

  return (
    <div className="space-y-6">
      <ReportFilters
        profiles={allProfiles}
        customRoles={allCustomRoles}
        selectedProfile={selectedProfile}
        selectedRole={selectedRole}
        onProfileChange={handleProfileChange}
        onRoleChange={handleRoleFilter}
        onClear={handleClearFilters}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Permissões - {displayReport?.profile?.name || profile.name}
            </CardTitle>
            <Button onClick={() => generateReport()} disabled={loading}>
              {loading ? "Gerando..." : "Atualizar Relatório"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!displayReport ? (
            <div className="text-center py-12 text-gray-600">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Clique em "Atualizar Relatório" para ver as permissões</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="pt-6 text-center">
                    <Shield className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-900">
                      {displayReport.permissions_summary.total_custom_roles}
                    </p>
                    <p className="text-xs text-blue-700">Roles Customizadas</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-green-900">
                      {displayReport.permissions_summary.unique_system_roles}
                    </p>
                    <p className="text-xs text-green-700">Permissões Únicas</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50">
                  <CardContent className="pt-6 text-center">
                    <Shield className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-purple-900">
                      {displayReport.permissions_summary.accessible_modules}/{displayReport.permissions_summary.total_modules}
                    </p>
                    <p className="text-xs text-purple-700">Módulos Acessíveis</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50">
                  <CardContent className="pt-6 text-center">
                    <Users className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                    <p className="text-2xl font-bold text-orange-900">
                      {displayReport.permissions_summary.users_affected}
                    </p>
                    <p className="text-xs text-orange-700">Usuários Afetados</p>
                  </CardContent>
                </Card>
                <Card className="bg-indigo-50">
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
                    <p className="text-2xl font-bold text-indigo-900">
                      {displayReport.permissions_summary.coverage_percentage}%
                    </p>
                    <p className="text-xs text-indigo-700">Cobertura Total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              {displayReport.permission_distribution && displayReport.permission_distribution.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ModuleDistributionChart data={displayReport.permission_distribution} />
                  <CoverageChart data={displayReport.permission_distribution} />
                </div>
              )}

              {displayReport.role_analytics && displayReport.role_analytics.length > 0 && (
                <RoleAnalyticsChart data={displayReport.role_analytics} />
              )}

              {/* Custom Roles */}
              <Card>
                <CardHeader>
                  <CardTitle>Roles Customizadas Atribuídas</CardTitle>
                </CardHeader>
                <CardContent>
                  {displayReport.custom_roles.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      Nenhuma role customizada atribuída
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {displayReport.custom_roles.map((role) => (
                        <div
                          key={role.id}
                          className="p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{role.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {role.description}
                              </p>
                            </div>
                            <Badge>{role.system_roles_count} permissões</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accessible Modules */}
              <Card>
                <CardHeader>
                  <CardTitle>Módulos Acessíveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(displayReport.accessible_modules).map(
                      ([module, data]) => (
                        <div
                          key={module}
                          className="p-3 border rounded-lg bg-green-50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-green-900 capitalize">
                                {module}
                              </p>
                              <p className="text-xs text-green-700 mt-1">
                                {data.roles.length} permissão(ões)
                              </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Users Affected */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuários Afetados</CardTitle>
                </CardHeader>
                <CardContent>
                  {displayReport.users_affected.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      Nenhum usuário vinculado a este perfil
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {displayReport.users_affected.map((user) => (
                        <div
                          key={user.id}
                          className="p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{user.position}</Badge>
                            <Badge variant="outline">{user.job_role}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Download Button */}
              <Button onClick={downloadReport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Baixar Relatório (JSON)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
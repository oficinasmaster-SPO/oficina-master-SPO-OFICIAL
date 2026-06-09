import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp, Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

export default function AuditoriaAutoAssign() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['auditProfileDistribution'],
        queryFn: async () => {
            const response = await base44.functions.invoke('auditProfileDistribution', {});
            return response.data;
        },
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription>
                        Erro ao carregar auditoria: {error.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Calcular totais por classificação
    const employeesSafe = data.job_roles
        .filter(j => j.classification === 'SAFE')
        .reduce((sum, j) => sum + j.total_employees, 0);
    
    const employeesWarning = data.job_roles
        .filter(j => j.classification === 'WARNING')
        .reduce((sum, j) => sum + j.total_employees, 0);
    
    const employeesCritical = data.job_roles
        .filter(j => j.classification === 'CRITICAL')
        .reduce((sum, j) => sum + j.total_employees, 0);

    const totalEmployees = data.total_employees || employeesSafe + employeesWarning + employeesCritical;
    
    const safePercentage = totalEmployees > 0 ? ((employeesSafe / totalEmployees) * 100).toFixed(1) : 0;
    const warningPercentage = totalEmployees > 0 ? ((employeesWarning / totalEmployees) * 100).toFixed(1) : 0;
    const criticalPercentage = totalEmployees > 0 ? ((employeesCritical / totalEmployees) * 100).toFixed(1) : 0;

    const criticalJobRoles = data.job_roles.filter(j => j.classification === 'CRITICAL').map(j => j.job_role);
    const warningJobRoles = data.job_roles.filter(j => j.classification === 'WARNING').map(j => j.job_role);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Auditoria Auto-Assign</h1>
                    <p className="text-gray-600">
                        Análise de estabilidade do mapeamento job_role → profile para ativação da pré-seleção automática
                    </p>
                </div>

                {/* Resumo */}
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Status Geral
                        </CardTitle>
                        <CardDescription>
                            Readiness: {data.readiness_percentage.toFixed(1)}% dos job_roles estão prontos para auto-assign
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-gray-600">Total Employees</p>
                                <p className="text-2xl font-bold">{totalEmployees}</p>
                                <p className="text-xs text-gray-500">{data.total_job_roles} cargos</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-green-600">Employees SAFE</p>
                                <p className="text-2xl font-bold text-green-700">{employeesSafe}</p>
                                <p className="text-xs text-green-600">{safePercentage}%</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-amber-600">Employees WARNING</p>
                                <p className="text-2xl font-bold text-amber-700">{employeesWarning}</p>
                                <p className="text-xs text-amber-600">{warningPercentage}%</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-red-600">Employees CRITICAL</p>
                                <p className="text-2xl font-bold text-red-700">{employeesCritical}</p>
                                <p className="text-xs text-red-600">{criticalPercentage}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Alertas */}
                {criticalJobRoles.length > 0 && (
                    <Alert variant="destructive">
                        <XCircle className="h-5 w-5" />
                        <AlertDescription>
                            <strong>Cargos Críticos ({criticalJobRoles.length}):</strong> {criticalJobRoles.join(", ")}
                        </AlertDescription>
                    </Alert>
                )}

                {warningJobRoles.length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                            <strong>Cargos em Atenção ({warningJobRoles.length}):</strong> {warningJobRoles.join(", ")}
                        </AlertDescription>
                    </Alert>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-green-700">SAFE</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-green-600" />
                                <div>
                                    <span className="text-2xl font-bold text-green-700">{data.safe_count}</span>
                                    <p className="text-xs text-green-600">job roles</p>
                                </div>
                            </div>
                            <p className="text-xs text-green-600 mt-2">≥95% mesmo perfil</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-amber-700">WARNING</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <div>
                                    <span className="text-2xl font-bold text-amber-700">{data.warning_count}</span>
                                    <p className="text-xs text-amber-600">job roles</p>
                                </div>
                            </div>
                            <p className="text-xs text-amber-600 mt-2">80-94% mesmo perfil</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-red-700">CRITICAL</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <div>
                                    <span className="text-2xl font-bold text-red-700">{data.critical_count}</span>
                                    <p className="text-xs text-red-600">job roles</p>
                                </div>
                            </div>
                            <p className="text-xs text-red-600 mt-2">&lt;80% mesmo perfil</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabela Detalhada */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Análise por Cargo
                        </CardTitle>
                        <CardDescription>
                            Classificação baseada na concentração de perfis por job_role
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cargo</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Employees</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Perfis</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Top Perfil</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Concentração</th>
                                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Classificação</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Justificativa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.job_roles.map((job) => (
                                        <tr key={job.job_role} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-medium">{job.job_role}</td>
                                            <td className="text-center py-3 px-4 text-sm">{job.total_employees}</td>
                                            <td className="text-center py-3 px-4 text-sm">{job.num_different_profiles}</td>
                                            <td className="text-center py-3 px-4 text-sm">{job.top_profile}</td>
                                            <td className="text-center py-3 px-4">
                                                <span className={`font-bold ${
                                                    job.top_profile_percentage >= 95 ? 'text-green-600' :
                                                    job.top_profile_percentage >= 80 ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                    {job.top_profile_percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <Badge className={
                                                    job.classification === 'SAFE' ? 'bg-green-100 text-green-800' :
                                                    job.classification === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                                }>
                                                    {job.classification}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{job.reasoning}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Critérios */}
                <Card>
                    <CardHeader>
                        <CardTitle>Critérios de Classificação</CardTitle>
                        <CardDescription>Metodologia rigorosa para validação do Auto-Assign</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    <h3 className="font-bold text-green-800">SAFE</h3>
                                </div>
                                <p className="text-sm text-green-700">
                                    <strong>≥95%</strong> dos colaboradores usam o mesmo perfil
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                    ✅ Pronto para auto-assign
                                </p>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    <h3 className="font-bold text-amber-800">WARNING</h3>
                                </div>
                                <p className="text-sm text-amber-700">
                                    <strong>80-94%</strong> dos colaboradores usam o mesmo perfil
                                </p>
                                <p className="text-xs text-amber-600 mt-2">
                                    ⚠️ Ajustar mapeamento
                                </p>
                            </div>

                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <h3 className="font-bold text-red-800">CRITICAL</h3>
                                </div>
                                <p className="text-sm text-red-700">
                                    <strong>&lt;80%</strong> dos colaboradores usam o mesmo perfil
                                </p>
                                <p className="text-xs text-red-600 mt-2">
                                    ❌ Mapeamento instável
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
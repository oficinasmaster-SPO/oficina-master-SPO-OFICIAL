import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function TestUsuarios() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadDebugData();
  }, []);

  const handleFixIssues = async () => {
    if (!confirm('Corrigir automaticamente os problemas encontrados?')) return;
    
    setLoading(true);
    try {
      // Chamar função backend que corrige tudo
      const result = await base44.functions.invoke('linkUserToEmployee', {});
      
      if (result.data.success) {
        alert('✅ Problemas corrigidos com sucesso!');
        await loadDebugData();
      } else {
        alert('❌ Erro: ' + result.data.error);
      }
    } catch (error) {
      console.error('Erro ao corrigir:', error);
      alert('❌ Erro ao corrigir: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDebugData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Buscar Employee por user_id primeiro, depois por email como fallback
      let employee = null;
      try {
        // Tentar buscar por user_id
        const empsByUserId = await base44.entities.Employee.filter({ user_id: user.id });
        employee = empsByUserId?.[0];
      } catch (e) {
        console.log("Erro ao buscar por user_id:", e);
      }

      // Se não encontrou por user_id, buscar por email
      if (!employee) {
        try {
          const empsByEmail = await base44.entities.Employee.filter({ email: user.email });
          employee = empsByEmail?.[0];
        } catch (e) {
          console.log("Erro ao buscar por email:", e);
        }
      }

      // Buscar Profile via backend
      let profileBackend = null;
      try {
        const result = await base44.functions.invoke('getUserProfile', {});
        profileBackend = result.data;
      } catch (e) {
        console.error("Erro getUserProfile:", e);
      }

      // Buscar UserProfile se tiver profile_id
      let userProfile = null;
      if (employee?.profile_id) {
        try {
          userProfile = await base44.entities.UserProfile.get(employee.profile_id);
        } catch (e) {
          console.error("Erro ao buscar UserProfile:", e);
        }
      }

      // Buscar CustomRoles se tiver
      let customRoles = [];
      if (userProfile?.custom_role_ids && userProfile.custom_role_ids.length > 0) {
        for (const roleId of userProfile.custom_role_ids) {
          try {
            const role = await base44.entities.CustomRole.get(roleId);
            customRoles.push(role);
          } catch (e) {
            console.error("Erro ao buscar CustomRole:", roleId, e);
          }
        }
      }

      setData({
        user,
        employee,
        profileBackend,
        userProfile,
        customRoles
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug de Permissões do Usuário</h1>
        <div className="flex gap-2">
          <Button onClick={handleFixIssues} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Corrigir Problemas
          </Button>
          <Button onClick={loadDebugData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
        </div>
      </div>

      {/* User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.user ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            User (base44.auth.me)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.user ? (
            <div className="space-y-2">
              <div><strong>ID:</strong> {data.user.id}</div>
              <div><strong>Email:</strong> {data.user.email}</div>
              <div><strong>Nome:</strong> {data.user.full_name}</div>
              <div><strong>Role:</strong> <Badge>{data.user.role}</Badge></div>
              <div><strong>Workshop ID:</strong> {data.user.workshop_id || "N/A"}</div>
              <div><strong>Status:</strong> <Badge variant={data.user.user_status === 'approved' ? 'default' : 'secondary'}>{data.user.user_status || 'N/A'}</Badge></div>
            </div>
          ) : (
            <p className="text-red-600">Usuário não autenticado</p>
          )}
        </CardContent>
      </Card>

      {/* Employee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.employee ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            Employee (entities.Employee)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.employee ? (
            <div className="space-y-2">
              <div><strong>ID:</strong> {data.employee.id}</div>
              <div><strong>Email:</strong> {data.employee.email}</div>
              <div><strong>Nome:</strong> {data.employee.full_name}</div>
              <div><strong>User ID:</strong> {data.employee.user_id || <Badge variant="destructive">NÃO VINCULADO</Badge>}</div>
              <div><strong>Profile ID:</strong> {data.employee.profile_id || <Badge variant="destructive">SEM PERFIL</Badge>}</div>
              <div><strong>Job Role:</strong> <Badge>{data.employee.job_role || 'N/A'}</Badge></div>
              <div><strong>Status:</strong> <Badge variant={data.employee.status === 'ativo' ? 'default' : 'secondary'}>{data.employee.status}</Badge></div>
            </div>
          ) : (
            <p className="text-red-600">Employee não encontrado para este email</p>
          )}
        </CardContent>
      </Card>

      {/* Backend getUserProfile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.profileBackend?.success ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            getUserProfile (backend)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(data?.profileBackend, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* UserProfile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.userProfile ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            UserProfile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.userProfile ? (
            <div className="space-y-2">
              <div><strong>ID:</strong> {data.userProfile.id}</div>
              <div><strong>Nome:</strong> {data.userProfile.name}</div>
              <div><strong>Status:</strong> <Badge>{data.userProfile.status}</Badge></div>
              <div><strong>Job Roles:</strong> {data.userProfile.job_roles?.join(', ') || 'N/A'}</div>
              <div>
                <strong>Custom Role IDs:</strong>
                <div className="mt-1">
                  {data.userProfile.custom_role_ids?.length > 0 ? (
                    data.userProfile.custom_role_ids.map(id => (
                      <Badge key={id} className="mr-1">{id}</Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">Nenhum</Badge>
                  )}
                </div>
              </div>
              <div>
                <strong>Roles (deprecated):</strong>
                <div className="mt-1">
                  {data.userProfile.roles?.length > 0 ? (
                    data.userProfile.roles.slice(0, 10).map(role => (
                      <Badge key={role} variant="outline" className="mr-1 mb-1 text-xs">{role}</Badge>
                    ))
                  ) : (
                    <Badge variant="secondary">Nenhum</Badge>
                  )}
                  {data.userProfile.roles?.length > 10 && (
                    <Badge variant="secondary">+{data.userProfile.roles.length - 10} mais</Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-red-600">UserProfile não encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* CustomRoles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.customRoles?.length > 0 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            CustomRoles ({data?.customRoles?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.customRoles?.length > 0 ? (
            <div className="space-y-4">
              {data.customRoles.map(role => (
                <div key={role.id} className="border p-4 rounded">
                  <h3 className="font-semibold">{role.name}</h3>
                  <div className="mt-2 text-sm text-gray-600">{role.description}</div>
                  <div className="mt-2">
                    <strong className="text-sm">System Roles ({role.system_roles?.length || 0}):</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {role.system_roles?.slice(0, 20).map(sr => (
                        <Badge key={sr} variant="outline" className="text-xs">{sr}</Badge>
                      ))}
                      {role.system_roles?.length > 20 && (
                        <Badge variant="secondary" className="text-xs">+{role.system_roles.length - 20} mais</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Nenhum CustomRole vinculado</p>
          )}
        </CardContent>
      </Card>

      {/* Diagnóstico Final */}
      <Card className="border-2 border-blue-500">
        <CardHeader>
          <CardTitle>🔍 Diagnóstico Final</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {data?.user ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>Usuário autenticado</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.employee ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>Employee cadastrado</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.employee?.user_id ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>Employee vinculado ao User (user_id preenchido)</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.employee?.profile_id ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>Profile ID atribuído ao Employee</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.userProfile ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>UserProfile existe no banco</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.customRoles?.length > 0 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>CustomRoles vinculados ao perfil</span>
          </div>
          <div className="flex items-center gap-2">
            {data?.customRoles?.some(r => r.system_roles?.length > 0) ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span>System Roles configurados nas CustomRoles</span>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-yellow-800 mb-2">❌ Problemas Identificados:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {!data?.employee?.user_id && <li>• Employee SEM user_id - não consegue buscar perfil</li>}
              {!data?.employee?.profile_id && <li>• Employee SEM profile_id - nenhum perfil atribuído</li>}
              {!data?.userProfile && data?.employee?.profile_id && <li>• UserProfile não existe no banco</li>}
              {data?.userProfile && (!data?.customRoles || data.customRoles.length === 0) && <li>• UserProfile sem CustomRoles vinculadas</li>}
              {data?.customRoles?.length > 0 && !data.customRoles.some(r => r.system_roles?.length > 0) && <li>• CustomRoles sem system_roles configuradas</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
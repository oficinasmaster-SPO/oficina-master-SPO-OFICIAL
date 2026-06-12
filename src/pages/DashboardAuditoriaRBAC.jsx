import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { pagePermissions as pagePermissionsMap } from "@/components/lib/pagePermissions";
import { getNavigationGroups } from "@/components/navigation/navigationGroups";
import { pagesConfig } from "@/pages.config";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Key, Building2, AlertTriangle, Eye, Clock, FileText } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import WheelLoader from "@/components/ui/WheelLoader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardAuditoriaRBAC() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: exceptions = [], isLoading: loadingExceptions } = useQuery({
    queryKey: ['rbac-audit-exceptions'],
    queryFn: async () => {
      const result = await base44.entities.UserPermissionException.filter({ is_active: true });
      return Array.isArray(result) ? result : [];
    },
    enabled: user?.role === 'admin'
  });

  const { data: globalAdmins = [], isLoading: loadingAdmins } = useQuery({
    queryKey: ['rbac-audit-global-admins'],
    queryFn: async () => {
      const result = await base44.entities.User.filter({ role: 'admin' });
      return Array.isArray(result) ? result : [];
    },
    enabled: user?.role === 'admin'
  });

  const { data: adminProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['rbac-audit-admin-profiles'],
    queryFn: async () => {
      const allProfiles = await base44.entities.UserProfile.list();
      return (allProfiles || []).filter(p => {
        const roles = p.data?.roles || p.roles || [];
        return roles.some(r => r.startsWith('admin.'));
      });
    },
    enabled: user?.role === 'admin'
  });

  const { data: employeesWithAdminProfiles = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['rbac-audit-employees-admin', adminProfiles.length],
    queryFn: async () => {
      if (!adminProfiles.length) return [];
      const profileIds = adminProfiles.map(p => p.id);
      // Fallback: we fetch a chunk of employees or just fetch all active employees with those profile_ids
      // As filter doesn't support $in easily depending on SDK version, we'll fetch all internal employees or those with admin profiles
      const allEmployees = await base44.entities.Employee.filter({ status: 'ativo' }, '-created_date', 500);
      return (allEmployees || []).filter(e => profileIds.includes(e.profile_id));
    },
    enabled: user?.role === 'admin' && adminProfiles.length > 0
  });

  const { data: recentImpersonations = [], isLoading: loadingImpersonations } = useQuery({
    queryKey: ['rbac-audit-impersonations'],
    queryFn: async () => {
      // Impersonations logged as action: 'impersonation_started' or target_type: 'impersonation'
      // RBACLog has action_type, check the schema
      const logs = await base44.entities.RBACLog.filter({ action_type: 'impersonation_started' }, '-created_date', 50);
      
      if (!logs || logs.length === 0) {
        // Fallback to checking any log containing "impersonation" in notes
        const allLogs = await base44.entities.RBACLog.list('-created_date', 200);
        return (allLogs || []).filter(l => 
          l.action_type === 'impersonation_started' || 
          (l.notes && l.notes.toLowerCase().includes('imperson'))
        );
      }
      return logs;
    },
    enabled: user?.role === 'admin'
  });

  const { data: allProfiles = [], isLoading: loadingAllProfiles } = useQuery({
    queryKey: ['rbac-audit-all-profiles'],
    queryFn: async () => {
      const result = await base44.entities.UserProfile.list();
      return Array.isArray(result) ? result : [];
    },
    enabled: user?.role === 'admin'
  });

  const {
    unprotectedPages,
    unusedPermissions,
    deadMenus,
    matrixData
  } = useMemo(() => {
    if (!allProfiles.length) return { unprotectedPages: [], unusedPermissions: [], deadMenus: [], matrixData: [] };

    const pages = Object.keys(pagesConfig?.Pages || {});
    const navGroups = getNavigationGroups(0);

    const unprotectedPages = pages.filter(p => pagePermissionsMap[p] === undefined);

    const systemPerms = new Set();
    Object.values(pagePermissionsMap).forEach(perm => {
      if (perm) systemPerms.add(perm);
    });
    
    const menus = [];
    navGroups.forEach(g => {
      g.items.forEach(i => {
        menus.push(i);
        if (i.requiredPermission) systemPerms.add(i.requiredPermission);
      });
    });

    const assignedPerms = new Set();
    const matrixData = allProfiles.map(p => {
      const roles = p.data?.roles || p.roles || [];
      roles.forEach(r => assignedPerms.add(r));
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        roles
      };
    }).sort((a, b) => b.roles.length - a.roles.length);

    const unusedPermissions = Array.from(systemPerms).filter(p => !assignedPerms.has(p));
    const deadMenus = menus.filter(m => m.requiredPermission && unusedPermissions.includes(m.requiredPermission));

    return { unprotectedPages, unusedPermissions, deadMenus, matrixData };
  }, [allProfiles]);

  const { data: recentTenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['rbac-audit-tenants'],
    queryFn: async () => {
      const logs = await base44.entities.UserActivityLog.list('-created_date', 500);
      const tenantMap = new Map();
      
      (logs || []).forEach(log => {
        if (log.workshop_id && log.workshop_name) {
          if (!tenantMap.has(log.workshop_id)) {
            tenantMap.set(log.workshop_id, {
              id: log.workshop_id,
              name: log.workshop_name,
              visits: 0,
              lastVisit: log.created_date,
              users: new Set()
            });
          }
          const t = tenantMap.get(log.workshop_id);
          t.visits++;
          t.users.add(log.user_email || log.user_id);
          if (new Date(log.created_date) > new Date(t.lastVisit)) {
            t.lastVisit = log.created_date;
          }
        }
      });
      
      return Array.from(tenantMap.values()).map(t => ({
        ...t,
        users: Array.from(t.users)
      })).sort((a, b) => b.visits - a.visits);
    },
    enabled: user?.role === 'admin'
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores podem acessar a auditoria de RBAC.</p>
      </div>
    );
  }

  const isLoading = loadingExceptions || loadingAdmins || loadingProfiles || loadingEmployees || loadingImpersonations || loadingTenants || loadingAllProfiles;

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><WheelLoader size="xl" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governança & Auditoria RBAC</h1>
          <p className="text-gray-600">Visão centralizada de bypasses, permissões e acessos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Bypasses Ativos</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{exceptions.length}</div>
            <p className="text-xs text-gray-500 mt-1">Exceções de permissão concedidas</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Admins Globais</CardTitle>
            <Key className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{globalAdmins.length}</div>
            <p className="text-xs text-gray-500 mt-1">Usuários com role: admin</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Perfis com Admin</CardTitle>
            <Shield className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{adminProfiles.length}</div>
            <p className="text-xs text-gray-500 mt-1">Perfis com regras admin.*</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Impersonações (Recentes)</CardTitle>
            <Eye className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{recentImpersonations.length}</div>
            <p className="text-xs text-gray-500 mt-1">Sessões iniciadas registradas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bypasses" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100/50 p-1">
          <TabsTrigger value="bypasses">Bypasses (Exceções)</TabsTrigger>
          <TabsTrigger value="admins">Permissões Administrativas</TabsTrigger>
          <TabsTrigger value="impersonation">Logs de Impersonação</TabsTrigger>
          <TabsTrigger value="tenants">Tenants Acessados</TabsTrigger>
          <TabsTrigger value="coverage">Matriz & Cobertura</TabsTrigger>
        </TabsList>

        <TabsContent value="bypasses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários com Bypass (Exceções Granulares)</CardTitle>
              <CardDescription>Usuários que possuem regras de exceção diretas (UserPermissionException) ativas.</CardDescription>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <div className="text-center p-8 text-gray-500">Nenhum bypass ativo encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário (ID)</TableHead>
                        <TableHead>Oficina (ID)</TableHead>
                        <TableHead>Tipo / Chave</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Justificativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exceptions.map(ex => (
                        <TableRow key={ex.id}>
                          <TableCell className="font-mono text-xs">{ex.user_id}</TableCell>
                          <TableCell className="font-mono text-xs">{ex.workshop_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ex.permission_type}</Badge>
                            <span className="ml-2 font-medium">{ex.permission_key}</span>
                          </TableCell>
                          <TableCell>
                            {ex.granted ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Concedido</Badge> : <Badge variant="destructive">Bloqueado</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[200px] truncate" title={ex.justification}>
                            {ex.justification || 'Não informada'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admins Globais (Nível de Banco)</CardTitle>
              <CardDescription>Usuários com a flag irrestrita role: 'admin' no banco de dados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Data de Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalAdmins.map(admin => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.full_name || 'N/A'}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell className="text-gray-500">
                          {admin.created_date ? format(new Date(admin.created_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colaboradores com Perfis Administrativos</CardTitle>
              <CardDescription>Colaboradores cujo perfil atrelado possui permissões admin.*</CardDescription>
            </CardHeader>
            <CardContent>
              {employeesWithAdminProfiles.length === 0 ? (
                <div className="text-center p-8 text-gray-500">Nenhum colaborador encontrado com perfil admin ativo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Oficina</TableHead>
                        <TableHead>Perfil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeesWithAdminProfiles.map(emp => {
                        const profile = adminProfiles.find(p => p.id === emp.profile_id);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.full_name}</TableCell>
                            <TableCell>{emp.email}</TableCell>
                            <TableCell className="text-xs text-gray-500 font-mono">{emp.workshop_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {profile?.name || emp.profile_id}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impersonation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Impersonação</CardTitle>
              <CardDescription>Registro de administradores visualizando a plataforma como outros usuários.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentImpersonations.length === 0 ? (
                <div className="text-center p-8 text-gray-500">Nenhum log recente de impersonação encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Usuário Alvo</TableHead>
                        <TableHead>Anotações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentImpersonations.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-gray-500 whitespace-nowrap">
                            {log.created_date ? format(new Date(log.created_date), "dd/MM HH:mm", { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{log.performed_by_name || log.performed_by}</div>
                            <div className="text-xs text-gray-500">{log.performed_by}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{log.target_name || 'Desconhecido'}</div>
                            <div className="text-xs text-gray-500 font-mono">{log.target_id}</div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[250px] truncate" title={log.notes}>
                            {log.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenants Acessados (Atividade Recente)</CardTitle>
              <CardDescription>Resumo de oficinas baseadas nos últimos 500 registros de atividade do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTenants.length === 0 ? (
                <div className="text-center p-8 text-gray-500">Nenhuma atividade recente registrada com workshop_id.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oficina</TableHead>
                        <TableHead>Qtd. Eventos</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead>Usuários Únicos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTenants.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="font-medium">{t.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{t.id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{t.visits}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {t.lastVisit ? format(new Date(t.lastVisit), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.users.slice(0, 3).map((u, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{u}</Badge>
                              ))}
                              {t.users.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{t.users.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Permissões Órfãs ({unusedPermissions?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Registradas no código, mas nunca atribuídas a nenhum perfil.</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {unusedPermissions?.map(p => <Badge key={p} variant="destructive" className="text-xs font-mono">{p}</Badge>)}
                  {unusedPermissions?.length === 0 && <span className="text-sm text-green-600">Nenhuma permissão órfã!</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Menus "Mortos" ({deadMenus?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Menus que exigem uma permissão órfã (ninguém acessa).</p>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {deadMenus?.map(m => <span key={m.name} className="text-xs text-gray-700 font-medium">• {m.name} <span className="text-gray-400 font-normal">({m.requiredPermission})</span></span>)}
                  {deadMenus?.length === 0 && <span className="text-sm text-green-600">Nenhum menu inacessível!</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Páginas sem Proteção ({unprotectedPages?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Rotas do pagesConfig não mapeadas no pagePermissions (abertas).</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto scrollbar-thin">
                  {unprotectedPages?.map(p => <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>)}
                  {unprotectedPages?.length === 0 && <span className="text-sm text-green-600">Todas as páginas protegidas!</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de Perfis Efetivos</CardTitle>
              <CardDescription>Lista completa de todos os perfis e suas respectivas permissões concedidas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Perfil</TableHead>
                      <TableHead className="w-[10%] text-center">Permissões</TableHead>
                      <TableHead className="w-[60%]">Lista de Acessos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixData?.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{p.name}</div>
                          <Badge variant="secondary" className="mt-1">{p.type}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold text-gray-700">
                          {p.roles.length}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.roles.slice(0, 10).map(r => (
                              <Badge key={r} variant="outline" className="text-xs bg-gray-50 font-mono text-gray-600">{r}</Badge>
                            ))}
                            {p.roles.length > 10 && (
                              <Badge variant="outline" className="text-xs bg-gray-100">+ {p.roles.length - 10} outras</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
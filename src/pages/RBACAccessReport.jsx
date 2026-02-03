import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateFullRouteReport, generateAccessStats, generateModuleReport } from "@/components/lib/routeAccessReport";
import { profileAccessMatrix } from "@/components/lib/rbacPermissionsReference";
import { Download, FileText, Shield, Users } from "lucide-react";
import { toast } from "sonner";

export default function RBACAccessReport() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState({});
  const [moduleReport, setModuleReport] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUserAndGenerateReport();
  }, []);

  const loadUserAndGenerateReport = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Carregar perfil
      let userProfile = null;
      try {
        const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
        if (employees && employees.length > 0) {
          const employee = employees[0];
          if (employee.profile_id) {
            const profiles = await base44.entities.UserProfile.filter({ id: employee.profile_id });
            if (profiles && profiles.length > 0) {
              userProfile = profiles[0];
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }

      setProfile(userProfile);

      // Gerar relatório
      const allRoutes = generateFullRouteReport();
      const statistics = generateAccessStats();
      const byModule = generateModuleReport();

      setRoutes(allRoutes);
      setStats(statistics);
      setModuleReport(byModule);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao carregar relatório de acesso");
    }
  };

  const exportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      user: {
        email: user?.email,
        role: user?.role,
        profile: profile?.name
      },
      stats,
      routes,
      moduleReport,
      profileMatrix: profileAccessMatrix
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rbac-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  const filteredRoutes = routes.filter(r => 
    r.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.permissionKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const variants = {
      public: { label: "Público", variant: "secondary" },
      admin: { label: "Admin", variant: "destructive" },
      interno: { label: "Interno", variant: "default" },
      rbac: { label: "RBAC", variant: "outline" },
      all: { label: "Todos", variant: "secondary" }
    };
    const config = variants[type] || variants.all;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      "Público": "secondary",
      "Restrito (Admin)": "destructive",
      "Restrito (Interno)": "default",
      "Protegido (RBAC)": "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório de Acesso RBAC</h1>
          <p className="text-gray-600 mt-1">
            Mapeamento completo de rotas, permissões e visibilidade
          </p>
        </div>
        <Button onClick={exportJSON} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar JSON
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total de Rotas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900">{stats.public}</div>
              <div className="text-sm text-gray-600">Públicas</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900">{stats.adminOnly}</div>
              <div className="text-sm text-gray-600">Admin Only</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900">{stats.internoOnly}</div>
              <div className="text-sm text-gray-600">Interno Only</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-gray-900">{stats.rbacProtected}</div>
              <div className="text-sm text-gray-600">RBAC Protected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Info */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Contexto do Usuário Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">E-mail</div>
                <div className="font-semibold">{user.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Role Base44</div>
                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600">Perfil RBAC</div>
                <div className="font-semibold">{profile?.name || "Sem perfil"}</div>
                {profile && (
                  <Badge variant="outline" className="mt-1">{profile.type}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas as Rotas</TabsTrigger>
          <TabsTrigger value="modules">Por Módulo</TabsTrigger>
          <TabsTrigger value="matrix">Matriz de Perfis</TabsTrigger>
        </TabsList>

        {/* Todas as Rotas */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Todas as Rotas ({filteredRoutes.length})</CardTitle>
                <Input
                  placeholder="Buscar rota, permissão ou módulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Visível Para</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoutes.map((route, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{route.pageName}</TableCell>
                        <TableCell className="text-xs text-gray-600">{route.permissionKey}</TableCell>
                        <TableCell>{getTypeBadge(route.type)}</TableCell>
                        <TableCell className="text-sm">{route.module}</TableCell>
                        <TableCell className="text-sm text-gray-700">{route.visibleTo}</TableCell>
                        <TableCell>{getStatusBadge(route.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Módulo */}
        <TabsContent value="modules">
          <div className="space-y-4">
            {Object.keys(moduleReport).sort().map(module => (
              <Card key={module}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{module}</span>
                    <Badge variant="outline">{moduleReport[module].length} rotas</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {moduleReport[module].map((route, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-mono text-sm font-semibold">{route.pageName}</div>
                          <div className="text-xs text-gray-600">{route.permissionKey}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeBadge(route.type)}
                          {getStatusBadge(route.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Matriz de Perfis */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Acesso por Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.keys(profileAccessMatrix).map(profileName => {
                  const profileData = profileAccessMatrix[profileName];
                  return (
                    <div key={profileName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold">{profileName}</h3>
                          <Badge variant={profileData.type === "interno" ? "default" : "secondary"}>
                            {profileData.type}
                          </Badge>
                        </div>
                        <Badge variant="outline">
                          {profileData.permissions.length} permissões
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {profileData.permissions.map(perm => (
                          <div key={perm} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="font-mono text-xs">{perm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
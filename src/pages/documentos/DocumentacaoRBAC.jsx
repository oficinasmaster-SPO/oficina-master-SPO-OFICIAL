import React from "react";
import {  Card, CardContent, CardHeader, CardTitle, CardDescription  } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CheckCircle, Key, Layout, FileCode } from "lucide-react";
import {  systemRoles  } from "@/components/lib/systemRoles";
import {  pagePermissions  } from "@/components/lib/pagePermissions";

export default function DocumentacaoRBAC() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-10 h-10" />
          <div>
            <h1 className="text-3xl font-bold">Sistema RBAC Granular</h1>
            <p className="text-blue-100 mt-1">
              Role-Based Access Control com permissÃµes granulares
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">{systemRoles.length}</div>
            <div className="text-sm text-blue-100">MÃ³dulos de PermissÃµes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">
              {systemRoles.flatMap(m => m.roles).length}
            </div>
            <div className="text-sm text-blue-100">PermissÃµes Granulares</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">
              {Object.keys(pagePermissions).length}
            </div>
            <div className="text-sm text-blue-100">PÃ¡ginas Mapeadas</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl font-bold">100%</div>
            <div className="text-sm text-blue-100">SeguranÃ§a Granular</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">VisÃ£o Geral</TabsTrigger>
          <TabsTrigger value="permissions">PermissÃµes</TabsTrigger>
          <TabsTrigger value="pages">PÃ¡ginas</TabsTrigger>
          <TabsTrigger value="implementation">ImplementaÃ§Ã£o</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                ImplementaÃ§Ãµes Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Mapeamento Centralizado de PÃ¡ginas</h3>
                    <p className="text-sm text-green-700">
                      Arquivo <code className="bg-green-100 px-1 rounded">components/lib/pagePermissions.js</code> criado com mapeamento de {Object.keys(pagePermissions).length} pÃ¡ginas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Hook usePermissions Atualizado</h3>
                    <p className="text-sm text-green-700">
                      FunÃ§Ã£o <code className="bg-green-100 px-1 rounded">canAccessPage()</code> agora usa permissÃµes granulares via mapeamento
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Sidebar com PermissÃµes Granulares</h3>
                    <p className="text-sm text-green-700">
                      Todos os {systemRoles.flatMap(g => g.items || []).length}+ itens de navegaÃ§Ã£o agora verificam permissÃµes especÃ­ficas
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">Sistema de Roles Granulares</h3>
                    <p className="text-sm text-green-700">
                      {systemRoles.length} mÃ³dulos com {systemRoles.flatMap(m => m.roles).length} permissÃµes especÃ­ficas definidas em <code className="bg-green-100 px-1 rounded">systemRoles.js</code>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
              <CardDescription>
                Fluxo de verificaÃ§Ã£o de permissÃµes granulares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">UsuÃ¡rio acessa pÃ¡gina</h4>
                    <p className="text-sm text-gray-600">Ex: "Colaboradores"</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Mapeamento de PÃ¡gina â†’ PermissÃ£o</h4>
                    <p className="text-sm text-gray-600">
                      "Colaboradores" â†’ <code className="bg-gray-100 px-1 rounded text-xs">employees.view</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">VerificaÃ§Ã£o no UserProfile</h4>
                    <p className="text-sm text-gray-600">
                      Verifica se <code className="bg-gray-100 px-1 rounded text-xs">employees.view</code> estÃ¡ no array <code className="bg-gray-100 px-1 rounded text-xs">roles</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">âœ“</div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Acesso Concedido/Negado</h4>
                    <p className="text-sm text-gray-600">
                      Baseado na presenÃ§a da permissÃ£o granular
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {systemRoles.map((module) => {
            const ModuleIcon = module.icon;
            return (
              <Card key={module.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ModuleIcon className="w-5 h-5" />
                    {module.name}
                  </CardTitle>
                  <CardDescription>{module.roles.length} permissÃµes granulares</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {module.roles.map((role) => (
                      <div key={role.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                                {role.id}
                              </code>
                              <Badge variant="outline" className="text-xs">
                                {role.permissions.join(", ")}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-sm">{role.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Mapeamento de PÃ¡ginas
              </CardTitle>
              <CardDescription>
                {Object.keys(pagePermissions).length} pÃ¡ginas mapeadas para permissÃµes especÃ­ficas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {Object.entries(pagePermissions).map(([page, permission]) => (
                  <div key={page} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{page}</span>
                      {permission ? (
                        <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono">
                          {permission}
                        </code>
                      ) : (
                        <Badge variant="outline" className="text-xs">PÃºblica</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="implementation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Arquivos Modificados/Criados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-mono text-sm text-green-700">âœ“ components/lib/pagePermissions.js</h4>
                <p className="text-xs text-gray-600">Mapeamento centralizado de pÃ¡ginas â†’ permissÃµes</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-mono text-sm text-green-700">âœ“ components/hooks/usePermissions.js</h4>
                <p className="text-xs text-gray-600">Hook atualizado com canAccessPage() granular</p>
              </div>

              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h4 className="font-mono text-sm text-green-700">âœ“ components/navigation/Sidebar.js</h4>
                <p className="text-xs text-gray-600">Todos os itens com requiredPermission definido</p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="font-mono text-sm text-blue-700">â†’ components/lib/systemRoles.js</h4>
                <p className="text-xs text-gray-600">JÃ¡ existente - define todas as permissÃµes granulares</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exemplo de Uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs space-y-2">
                <div className="text-green-400">// Hook usePermissions</div>
                <div>const {`{ hasPermission, canAccessPage }`} = usePermissions();</div>
                <div className="mt-4 text-green-400">// Verificar acesso a uma pÃ¡gina</div>
                <div>const canView = canAccessPage('Colaboradores');</div>
                <div className="text-gray-500">// Retorna true se user tem permissÃ£o "employees.view"</div>
                <div className="mt-4 text-green-400">// Verificar permissÃ£o especÃ­fica</div>
                <div>if (hasPermission('employees.create')) {`{`}</div>
                <div className="ml-4">// Mostrar botÃ£o "Adicionar"</div>
                <div>{`}`}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



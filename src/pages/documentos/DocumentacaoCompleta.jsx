import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Users, UserPlus, CheckCircle, FileText, 
  Lock, Settings, Workflow, Database, GitBranch
} from "lucide-react";

export default function DocumentacaoCompleta() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ðŸ“š DocumentaÃ§Ã£o Completa do Sistema
          </h1>
          <p className="text-lg text-gray-600">
            Guia completo de RBAC e Cadastro de Colaboradores
          </p>
        </div>

        <Tabs defaultValue="rbac" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="rbac">
              <Shield className="w-4 h-4 mr-2" />
              RBAC
            </TabsTrigger>
            <TabsTrigger value="cadastro">
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger value="fluxos">
              <Workflow className="w-4 h-4 mr-2" />
              Fluxos
            </TabsTrigger>
            <TabsTrigger value="entidades">
              <Database className="w-4 h-4 mr-2" />
              Entidades
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: RBAC */}
          <TabsContent value="rbac" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-600" />
                  Sistema RBAC (Role-Based Access Control)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸŽ¯ Conceitos Fundamentais</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 space-y-2">
                    <p className="font-semibold text-blue-900">Hierarquia de PermissÃµes:</p>
                    <ol className="list-decimal ml-6 space-y-1 text-blue-800">
                      <li><strong>CustomRole</strong> â†’ Define permissÃµes granulares do sistema</li>
                      <li><strong>UserProfile</strong> â†’ Agrupa CustomRoles e Job Roles</li>
                      <li><strong>Employee</strong> â†’ Vinculado a um UserProfile via profile_id</li>
                      <li><strong>User</strong> â†’ Herda permissÃµes via Employee.profile_id</li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ” Componentes do Sistema</h3>
                  <div className="grid gap-4">
                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">1. CustomRole</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Define um conjunto de permissÃµes granulares. Ex: "TÃ©cnico SÃªnior", "Vendedor", "Supervisor"
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                        <strong>Campos principais:</strong><br/>
                        â€¢ name: string<br/>
                        â€¢ description: string<br/>
                        â€¢ system_roles: string[] (ex: ["dashboard.view", "employees.view"])<br/>
                        â€¢ entity_permissions: object (ex: {"{"}Employee: ["read", "update"]{"}"})
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">2. UserProfile</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Agrupa mÃºltiplas CustomRoles e Job Roles. Ex: "Perfil TÃ©cnico", "Perfil Gerencial"
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                        <strong>Campos principais:</strong><br/>
                        â€¢ name: string<br/>
                        â€¢ type: "interno" | "externo" | "sistema"<br/>
                        â€¢ custom_role_ids: string[] (IDs das CustomRoles)<br/>
                        â€¢ job_roles: string[] (ex: ["tecnico", "lider_tecnico"])<br/>
                        â€¢ sidebar_permissions: object<br/>
                        â€¢ module_permissions: object
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">3. System Roles (Granulares)</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        PermissÃµes atÃ´micas definidas em <code className="bg-gray-100 px-1 rounded">systemRoles.js</code>
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs">
                        <strong>MÃ³dulos disponÃ­veis:</strong><br/>
                        â€¢ Dashboard (dashboard.view, dashboard.edit)<br/>
                        â€¢ Colaboradores (employees.view, employees.create, employees.edit)<br/>
                        â€¢ Financeiro (financeiro.view, financeiro.edit)<br/>
                        â€¢ DiagnÃ³sticos (diagnostics.view, diagnostics.create)<br/>
                        â€¢ Admin (admin.users, admin.profiles, admin.audit)
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ”„ Fluxo de Carregamento de PermissÃµes</h3>
                  <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                    <p className="font-semibold text-gray-900">Hook: <code>usePermissions()</code></p>
                    <ol className="list-decimal ml-6 space-y-2 text-sm text-gray-700">
                      <li>Busca o User autenticado (<code>base44.auth.me()</code>)</li>
                      <li>Se Admin â†’ Retorna todas as permissÃµes</li>
                      <li>Se User comum:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Busca Employee vinculado via <code>user_id</code></li>
                          <li>ObtÃ©m <code>Employee.profile_id</code></li>
                          <li>Carrega <code>UserProfile</code></li>
                          <li>Carrega todas <code>CustomRole</code> via <code>custom_role_ids</code></li>
                          <li>Agrega todas <code>system_roles</code> das CustomRoles</li>
                        </ul>
                      </li>
                      <li>Retorna array de permissÃµes: <code>["dashboard.view", "employees.view", ...]</code></li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ“‚ Arquivos Principais</h3>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/lib/systemRoles.js</p>
                        <p className="text-xs text-gray-600">Define todas as permissÃµes granulares do sistema</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/lib/pagePermissions.js</p>
                        <p className="text-xs text-gray-600">Mapeia cada pÃ¡gina para a permissÃ£o necessÃ¡ria</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/hooks/usePermissions.js</p>
                        <p className="text-xs text-gray-600">Hook principal que carrega e verifica permissÃµes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">layout.js</p>
                        <p className="text-xs text-gray-600">Bloqueia acesso Ã  pÃ¡gina se usuÃ¡rio sem permissÃ£o</p>
                      </div>
                    </div>
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CADASTRO */}
          <TabsContent value="cadastro" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-green-600" />
                  Processo de Cadastro de Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ“‹ Etapas do Processo</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-600 pl-4">
                      <h4 className="font-bold text-blue-900 mb-2">
                        ETAPA 1: Gerar Link de Convite
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>PÃ¡gina:</strong> <code>pages/ConvidarColaborador.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Admin/Owner preenche formulÃ¡rio com dados do colaborador</li>
                        <li>Seleciona <code>job_role</code> (ex: tÃ©cnico, gerente)</li>
                        <li>Clica em "Gerar Link de Acesso"</li>
                        <li>Sistema cria <code>EmployeeInvite</code> com token Ãºnico</li>
                        <li>Retorna URL: <code>https://app.com/PrimeiroAcesso?token=XXX</code></li>
                        <li>Admin copia link e envia manualmente via WhatsApp/Email</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-green-600 pl-4">
                      <h4 className="font-bold text-green-900 mb-2">
                        ETAPA 2: Colaborador Acessa Link
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>PÃ¡gina:</strong> <code>pages/PrimeiroAcesso.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Colaborador clica no link recebido</li>
                        <li>Sistema valida token do convite</li>
                        <li>Exibe formulÃ¡rio com dados prÃ©-preenchidos</li>
                        <li>Colaborador completa cadastro (senha, foto, etc.)</li>
                        <li>Clica em "Finalizar Cadastro"</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-purple-600 pl-4">
                      <h4 className="font-bold text-purple-900 mb-2">
                        ETAPA 3: Registro no Backend
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>FunÃ§Ã£o:</strong> <code>functions/registerInvitedEmployee.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Valida token do convite</li>
                        <li>Cria/Atualiza <code>Employee</code> com dados fornecidos</li>
                        <li><strong>ðŸ”„ AUTO-VINCULAÃ‡ÃƒO:</strong> Busca <code>UserProfile</code> que contÃ©m o <code>job_role</code></li>
                        <li>Cria <code>User</code> com <code>user_status: "pending"</code> e <code>profile_id</code></li>
                        <li>Vincula <code>Employee.user_id = User.id</code></li>
                        <li>Atualiza convite para status "acessado"</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-orange-600 pl-4">
                      <h4 className="font-bold text-orange-900 mb-2">
                        ETAPA 4: AprovaÃ§Ã£o pelo Admin
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>FunÃ§Ã£o:</strong> <code>functions/approveUserAccess.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Admin acessa pÃ¡gina de aprovaÃ§Ã£o (<code>pages/Usuarios.js</code>)</li>
                        <li>Visualiza usuÃ¡rios com <code>user_status: "pending"</code></li>
                        <li>Clica em "Aprovar Acesso"</li>
                        <li>Sistema atualiza <code>User.user_status = "active"</code></li>
                        <li>Sincroniza <code>Employee.user_status = "ativo"</code></li>
                        <li>Confirma/atualiza <code>profile_id</code> se necessÃ¡rio</li>
                        <li>Cria registro de auditoria</li>
                        <li>Atualiza convite para status "concluido"</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-red-600 pl-4">
                      <h4 className="font-bold text-red-900 mb-2">
                        ETAPA 5: Primeiro Login
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Componente:</strong> <code>Layout.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Colaborador faz login com email/senha</li>
                        <li>Sistema registra <code>first_login_at</code> e <code>last_login_at</code></li>
                        <li>Se <code>user_status == "pending"</code> â†’ Exibe tela "Aguardando AprovaÃ§Ã£o"</li>
                        <li>Se <code>user_status == "active"</code> â†’ Carrega permissÃµes e libera acesso</li>
                        <li><code>usePermissions()</code> busca Employee â†’ UserProfile â†’ CustomRoles</li>
                        <li>Redireciona para Home com acesso permitido</li>
                      </ol>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ”‘ Auto-VinculaÃ§Ã£o de Perfil</h3>
                  <div className="bg-green-50 border-l-4 border-green-600 p-4">
                    <p className="font-semibold text-green-900 mb-2">Como funciona:</p>
                    <ol className="list-decimal ml-6 space-y-1 text-sm text-green-800">
                      <li>Colaborador cadastrado com <code>job_role = "tecnico"</code></li>
                      <li>Sistema busca <code>UserProfile</code> onde <code>job_roles.includes("tecnico")</code></li>
                      <li>Se encontrado, vincula automaticamente <code>User.profile_id = UserProfile.id</code></li>
                      <li>Colaborador herda todas permissÃµes desse perfil</li>
                    </ol>
                    <div className="mt-3 bg-white p-3 rounded border border-green-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Exemplo:</p>
                      <pre className="text-xs text-gray-600">
UserProfile: "Perfil TÃ©cnico"<br/>
  â”œâ”€ job_roles: ["tecnico", "lider_tecnico"]<br/>
  â””â”€ custom_role_ids: ["role_123", "role_456"]<br/>
<br/>
Quando colaborador com job_role="tecnico" se cadastra:<br/>
  â†’ Automaticamente vinculado ao "Perfil TÃ©cnico"<br/>
  â†’ Herda permissÃµes das CustomRoles role_123 e role_456
                      </pre>
                    </div>
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: FLUXOS */}
          <TabsContent value="fluxos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-6 h-6 text-purple-600" />
                  Fluxos Completos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ”„ Fluxo 1: Cadastro Completo</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{`â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. ADMIN GERA LINK                                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ConvidarColaborador.js                                      â”‚
â”‚   â””â”€> functions/sendEmployeeInvite                         â”‚
â”‚       â””â”€> Cria EmployeeInvite (status: "enviado")          â”‚
â”‚       â””â”€> Retorna link: /PrimeiroAcesso?token=XXX          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 2. COLABORADOR ACESSA LINK                                  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ PrimeiroAcesso.js                                           â”‚
â”‚   â””â”€> Valida token                                          â”‚
â”‚   â””â”€> Exibe formulÃ¡rio prÃ©-preenchido                       â”‚
â”‚   â””â”€> Colaborador preenche senha, foto, etc.               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 3. REGISTRO NO BACKEND                                      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ functions/registerInvitedEmployee.js                        â”‚
â”‚   â”œâ”€> Valida convite                                        â”‚
â”‚   â”œâ”€> Cria/Atualiza Employee                                â”‚
â”‚   â”œâ”€> ðŸ”„ Busca UserProfile por job_role                     â”‚
â”‚   â”œâ”€> Cria User (user_status: "pending")                   â”‚
â”‚   â”‚   â””â”€> profile_id: auto-vinculado                       â”‚
â”‚   â”œâ”€> Vincula Employee.user_id = User.id                   â”‚
â”‚   â””â”€> Atualiza convite (status: "acessado")                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 4. APROVAÃ‡ÃƒO ADMIN                                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ functions/approveUserAccess.js                              â”‚
â”‚   â”œâ”€> Atualiza User.user_status = "active"                 â”‚
â”‚   â”œâ”€> Sincroniza Employee.user_status = "ativo"            â”‚
â”‚   â”œâ”€> Confirma profile_id                                   â”‚
â”‚   â”œâ”€> Registra auditoria                                    â”‚
â”‚   â””â”€> Atualiza convite (status: "concluido")               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 5. PRIMEIRO LOGIN                                           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Layout.js                                                   â”‚
â”‚   â”œâ”€> Se user_status = "pending"                           â”‚
â”‚   â”‚   â””â”€> Exibe: "Aguardando AprovaÃ§Ã£o"                    â”‚
â”‚   â”‚                                                          â”‚
â”‚   â””â”€> Se user_status = "active"                            â”‚
â”‚       â”œâ”€> usePermissions() carrega permissÃµes               â”‚
â”‚       â”‚   â”œâ”€> Busca Employee via user_id                   â”‚
â”‚       â”‚   â”œâ”€> Carrega UserProfile via profile_id           â”‚
â”‚       â”‚   â”œâ”€> Carrega CustomRoles via custom_role_ids      â”‚
â”‚       â”‚   â””â”€> Agrega todas system_roles                    â”‚
â”‚       â””â”€> Libera acesso Ã  aplicaÃ§Ã£o                        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜`}
                    </pre>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">ðŸ” Fluxo 2: VerificaÃ§Ã£o de PermissÃµes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{`â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ USUÃRIO TENTA ACESSAR PÃGINA                                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Layout.js (Verifica Acesso)                                 â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ usePermissions().canAccessPage(currentPageName)            â”‚
â”‚   â†“                                                          â”‚
â”‚   â”œâ”€> Se Admin: return true                                 â”‚
â”‚   â”‚                                                          â”‚
â”‚   â””â”€> Se User comum:                                        â”‚
â”‚       â”œâ”€> Busca permissÃ£o necessÃ¡ria em pagePermissions.js â”‚
â”‚       â”‚   Ex: "Colaboradores" â†’ "employees.view"           â”‚
â”‚       â”‚                                                      â”‚
â”‚       â”œâ”€> Verifica se user tem essa permissÃ£o:             â”‚
â”‚       â”‚   hasPermission("employees.view")                  â”‚
â”‚       â”‚                                                      â”‚
â”‚       â””â”€> Se TEM: Renderiza pÃ¡gina                         â”‚
â”‚           Se NÃƒO TEM: Exibe "Acesso Negado"                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ COMO hasPermission() FUNCIONA                               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ 1. Busca Employee onde user_id = currentUser.id            â”‚
â”‚ 2. ObtÃ©m Employee.profile_id                                â”‚
â”‚ 3. Carrega UserProfile                                      â”‚
â”‚ 4. Itera sobre UserProfile.custom_role_ids                  â”‚
â”‚ 5. Para cada CustomRole:                                    â”‚
â”‚    â””â”€> Agrega system_roles[]                               â”‚
â”‚ 6. Retorna array unificado:                                 â”‚
â”‚    ["dashboard.view", "employees.view", "employees.edit"]  â”‚
â”‚ 7. Verifica se array contÃ©m permissÃ£o solicitada           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜`}
                    </pre>
                  </div>
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: ENTIDADES */}
          <TabsContent value="entidades" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-6 h-6 text-indigo-600" />
                  Estrutura de Entidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">User (Base44) - GestÃ£o de Perfil</h4>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <p className="font-semibold text-gray-900">Atributos padrÃ£o (imutÃ¡veis):</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li><strong>id</strong>, <strong>created_date</strong>, <strong>updated_date</strong></li>
                          <li><strong>full_name</strong>, <strong>email</strong>, <strong>role</strong> ("admin" | "user")</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Atributos personalizados:</p>
                        <p>
                          Adicione campos no arquivo <code>entities/User.json</code> (ex:{" "}
                          <code>{`{"bio": {"type": "string"}}`}</code>) e acesse via SDK.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">PermissÃµes automÃ¡ticas:</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li><strong>Admin</strong>: lista/edita/deleta usuÃ¡rios (exceto atributos padrÃ£o)</li>
                          <li><strong>User</strong>: acessa e atualiza apenas o prÃ³prio registro</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Acesso ao usuÃ¡rio logado:</p>
                        <p>
                          <code>base44.auth.me()</code> retorna o usuÃ¡rio atual. Em pÃ¡ginas pÃºblicas, pode retornar{" "}
                          <code>null</code> ou lanÃ§ar erro conforme a configuraÃ§Ã£o de proteÃ§Ã£o.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Ferramentas para o desenvolvedor:</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li><code>read_entities("User")</code> para inspecionar o schema atual</li>
                          <li>Dashboard Base44 para visualizar e gerenciar usuÃ¡rios</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-2">
                        <div>
                          <span className="font-semibold">UsuÃ¡rio logado:</span> <br />
                          <code>{`const user = await base44.auth.me();`}</code>
                        </div>
                        <div>
                          <span className="font-semibold">Atualizar perfil:</span> <br />
                          <code>{`await base44.auth.updateMe({ bio: "Minha nova biografia." });`}</code>
                        </div>
                        <div>
                          <span className="font-semibold">Listar usuÃ¡rios (admin):</span> <br />
                          <code>{`const allUsers = await base44.entities.User.list();`}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">Employee</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                      <div><strong>id:</strong> string (auto)</div>
                      <div><strong>workshop_id:</strong> string (oficina vinculada)</div>
                      <div><strong>user_id:</strong> string (User vinculado)</div>
                      <div><strong>profile_id:</strong> string (UserProfile vinculado)</div>
                      <div><strong>full_name:</strong> string</div>
                      <div><strong>email:</strong> string</div>
                      <div><strong>position:</strong> string (cargo)</div>
                      <div><strong>job_role:</strong> enum (funÃ§Ã£o do sistema)</div>
                      <div><strong>area:</strong> enum</div>
                      <div><strong>user_status:</strong> "ativo" | "inativo" | "bloqueado"</div>
                      <div><strong>tipo_vinculo:</strong> "interno" | "cliente"</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">User (Built-in)</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                      <div><strong>id:</strong> string (auto)</div>
                      <div><strong>email:</strong> string</div>
                      <div><strong>full_name:</strong> string</div>
                      <div><strong>role:</strong> "admin" | "user"</div>
                      <div><strong>profile_id:</strong> string (UserProfile)</div>
                      <div><strong>workshop_id:</strong> string</div>
                      <div><strong>job_role:</strong> enum</div>
                      <div><strong>user_status:</strong> "pending" | "active" | "blocked"</div>
                      <div><strong>first_login_at:</strong> datetime</div>
                      <div><strong>last_login_at:</strong> datetime</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">UserProfile</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                      <div><strong>id:</strong> string (auto)</div>
                      <div><strong>name:</strong> string</div>
                      <div><strong>type:</strong> "interno" | "externo" | "sistema"</div>
                      <div><strong>permission_type:</strong> "job_role" | "role" | "custom_role"</div>
                      <div><strong>custom_role_ids:</strong> string[] (CustomRoles)</div>
                      <div><strong>job_roles:</strong> string[] (funÃ§Ãµes vinculadas)</div>
                      <div><strong>status:</strong> "ativo" | "inativo"</div>
                      <div><strong>sidebar_permissions:</strong> object</div>
                      <div><strong>module_permissions:</strong> object</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">CustomRole</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                      <div><strong>id:</strong> string (auto)</div>
                      <div><strong>name:</strong> string</div>
                      <div><strong>description:</strong> string</div>
                      <div><strong>system_roles:</strong> string[] (permissÃµes granulares)</div>
                      <div><strong>entity_permissions:</strong> object (CRUD por entidade)</div>
                      <div><strong>status:</strong> "ativo" | "inativo"</div>
                      <div><strong>created_by:</strong> string (email)</div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h4 className="font-bold text-lg mb-2">EmployeeInvite</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                      <div><strong>id:</strong> string (auto)</div>
                      <div><strong>workshop_id:</strong> string</div>
                      <div><strong>employee_id:</strong> string</div>
                      <div><strong>name:</strong> string</div>
                      <div><strong>email:</strong> string</div>
                      <div><strong>position:</strong> string</div>
                      <div><strong>job_role:</strong> enum</div>
                      <div><strong>invite_token:</strong> string (Ãºnico)</div>
                      <div><strong>expires_at:</strong> datetime</div>
                      <div><strong>status:</strong> "enviado" | "acessado" | "concluido" | "expirado"</div>
                      <div><strong>created_user_id:</strong> string (apÃ³s conclusÃ£o)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}





import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
            📚 Documentação Completa do Sistema
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
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🎯 Conceitos Fundamentais</h3>
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 space-y-2">
                    <p className="font-semibold text-blue-900">Hierarquia de Permissões:</p>
                    <ol className="list-decimal ml-6 space-y-1 text-blue-800">
                      <li><strong>CustomRole</strong> → Define permissões granulares do sistema</li>
                      <li><strong>UserProfile</strong> → Agrupa CustomRoles e Job Roles</li>
                      <li><strong>Employee</strong> → Vinculado a um UserProfile via profile_id</li>
                      <li><strong>User</strong> → Herda permissões via Employee.profile_id</li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔐 Componentes do Sistema</h3>
                  <div className="grid gap-4">
                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">1. CustomRole</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Define um conjunto de permissões granulares. Ex: "Técnico Sênior", "Vendedor", "Supervisor"
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                        <strong>Campos principais:</strong><br/>
                        • name: string<br/>
                        • description: string<br/>
                        • system_roles: string[] (ex: ["dashboard.view", "employees.view"])<br/>
                        • entity_permissions: object (ex: {"{"}Employee: ["read", "update"]{"}"})
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">2. UserProfile</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Agrupa múltiplas CustomRoles e Job Roles. Ex: "Perfil Técnico", "Perfil Gerencial"
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                        <strong>Campos principais:</strong><br/>
                        • name: string<br/>
                        • type: "interno" | "externo" | "sistema"<br/>
                        • custom_role_ids: string[] (IDs das CustomRoles)<br/>
                        • job_roles: string[] (ex: ["tecnico", "lider_tecnico"])<br/>
                        • sidebar_permissions: object<br/>
                        • module_permissions: object
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-bold text-lg text-gray-900 mb-2">3. System Roles (Granulares)</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Permissões atômicas definidas em <code className="bg-gray-100 px-1 rounded">systemRoles.js</code>
                      </p>
                      <div className="bg-gray-50 p-3 rounded text-xs">
                        <strong>Módulos disponíveis:</strong><br/>
                        • Dashboard (dashboard.view, dashboard.edit)<br/>
                        • Colaboradores (employees.view, employees.create, employees.edit)<br/>
                        • Financeiro (financeiro.view, financeiro.edit)<br/>
                        • Diagnósticos (diagnostics.view, diagnostics.create)<br/>
                        • Admin (admin.users, admin.profiles, admin.audit)
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔄 Fluxo de Carregamento de Permissões</h3>
                  <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                    <p className="font-semibold text-gray-900">Hook: <code>usePermissions()</code></p>
                    <ol className="list-decimal ml-6 space-y-2 text-sm text-gray-700">
                      <li>Busca o User autenticado (<code>base44.auth.me()</code>)</li>
                      <li>Se Admin → Retorna todas as permissões</li>
                      <li>Se User comum:
                        <ul className="list-disc ml-6 mt-1">
                          <li>Busca Employee vinculado via <code>user_id</code></li>
                          <li>Obtém <code>Employee.profile_id</code></li>
                          <li>Carrega <code>UserProfile</code></li>
                          <li>Carrega todas <code>CustomRole</code> via <code>custom_role_ids</code></li>
                          <li>Agrega todas <code>system_roles</code> das CustomRoles</li>
                        </ul>
                      </li>
                      <li>Retorna array de permissões: <code>["dashboard.view", "employees.view", ...]</code></li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">📂 Arquivos Principais</h3>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/lib/systemRoles.js</p>
                        <p className="text-xs text-gray-600">Define todas as permissões granulares do sistema</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/lib/pagePermissions.js</p>
                        <p className="text-xs text-gray-600">Mapeia cada página para a permissão necessária</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">components/hooks/usePermissions.js</p>
                        <p className="text-xs text-gray-600">Hook principal que carrega e verifica permissões</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white border rounded">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">layout.js</p>
                        <p className="text-xs text-gray-600">Bloqueia acesso à página se usuário sem permissão</p>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-3">📋 Etapas do Processo</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-blue-600 pl-4">
                      <h4 className="font-bold text-blue-900 mb-2">
                        ETAPA 1: Gerar Link de Convite
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Página:</strong> <code>pages/ConvidarColaborador.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Admin/Owner preenche formulário com dados do colaborador</li>
                        <li>Seleciona <code>job_role</code> (ex: técnico, gerente)</li>
                        <li>Clica em "Gerar Link de Acesso"</li>
                        <li>Sistema cria <code>EmployeeInvite</code> com token único</li>
                        <li>Retorna URL: <code>https://app.com/PrimeiroAcesso?token=XXX</code></li>
                        <li>Admin copia link e envia manualmente via WhatsApp/Email</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-green-600 pl-4">
                      <h4 className="font-bold text-green-900 mb-2">
                        ETAPA 2: Colaborador Acessa Link
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Página:</strong> <code>pages/PrimeiroAcesso.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Colaborador clica no link recebido</li>
                        <li>Sistema valida token do convite</li>
                        <li>Exibe formulário com dados pré-preenchidos</li>
                        <li>Colaborador completa cadastro (senha, foto, etc.)</li>
                        <li>Clica em "Finalizar Cadastro"</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-purple-600 pl-4">
                      <h4 className="font-bold text-purple-900 mb-2">
                        ETAPA 3: Registro no Backend
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Função:</strong> <code>functions/registerInvitedEmployee.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Valida token do convite</li>
                        <li>Cria/Atualiza <code>Employee</code> com dados fornecidos</li>
                        <li><strong>🔄 AUTO-VINCULAÇÃO:</strong> Busca <code>UserProfile</code> que contém o <code>job_role</code></li>
                        <li>Cria <code>User</code> com <code>user_status: "pending"</code> e <code>profile_id</code></li>
                        <li>Vincula <code>Employee.user_id = User.id</code></li>
                        <li>Atualiza convite para status "acessado"</li>
                      </ol>
                    </div>

                    <div className="border-l-4 border-orange-600 pl-4">
                      <h4 className="font-bold text-orange-900 mb-2">
                        ETAPA 4: Aprovação pelo Admin
                      </h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Função:</strong> <code>functions/approveUserAccess.js</code>
                      </p>
                      <ol className="list-decimal ml-6 space-y-1 text-sm text-gray-600">
                        <li>Admin acessa página de aprovação (<code>pages/Usuarios.js</code>)</li>
                        <li>Visualiza usuários com <code>user_status: "pending"</code></li>
                        <li>Clica em "Aprovar Acesso"</li>
                        <li>Sistema atualiza <code>User.user_status = "active"</code></li>
                        <li>Sincroniza <code>Employee.user_status = "ativo"</code></li>
                        <li>Confirma/atualiza <code>profile_id</code> se necessário</li>
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
                        <li>Se <code>user_status == "pending"</code> → Exibe tela "Aguardando Aprovação"</li>
                        <li>Se <code>user_status == "active"</code> → Carrega permissões e libera acesso</li>
                        <li><code>usePermissions()</code> busca Employee → UserProfile → CustomRoles</li>
                        <li>Redireciona para Home com acesso permitido</li>
                      </ol>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔑 Auto-Vinculação de Perfil</h3>
                  <div className="bg-green-50 border-l-4 border-green-600 p-4">
                    <p className="font-semibold text-green-900 mb-2">Como funciona:</p>
                    <ol className="list-decimal ml-6 space-y-1 text-sm text-green-800">
                      <li>Colaborador cadastrado com <code>job_role = "tecnico"</code></li>
                      <li>Sistema busca <code>UserProfile</code> onde <code>job_roles.includes("tecnico")</code></li>
                      <li>Se encontrado, vincula automaticamente <code>User.profile_id = UserProfile.id</code></li>
                      <li>Colaborador herda todas permissões desse perfil</li>
                    </ol>
                    <div className="mt-3 bg-white p-3 rounded border border-green-200">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Exemplo:</p>
                      <pre className="text-xs text-gray-600">
UserProfile: "Perfil Técnico"<br/>
  ├─ job_roles: ["tecnico", "lider_tecnico"]<br/>
  └─ custom_role_ids: ["role_123", "role_456"]<br/>
<br/>
Quando colaborador com job_role="tecnico" se cadastra:<br/>
  → Automaticamente vinculado ao "Perfil Técnico"<br/>
  → Herda permissões das CustomRoles role_123 e role_456
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
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔄 Fluxo 1: Cadastro Completo</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{`┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN GERA LINK                                          │
├─────────────────────────────────────────────────────────────┤
│ ConvidarColaborador.js                                      │
│   └─> functions/sendEmployeeInvite                         │
│       └─> Cria EmployeeInvite (status: "enviado")          │
│       └─> Retorna link: /PrimeiroAcesso?token=XXX          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. COLABORADOR ACESSA LINK                                  │
├─────────────────────────────────────────────────────────────┤
│ PrimeiroAcesso.js                                           │
│   └─> Valida token                                          │
│   └─> Exibe formulário pré-preenchido                       │
│   └─> Colaborador preenche senha, foto, etc.               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REGISTRO NO BACKEND                                      │
├─────────────────────────────────────────────────────────────┤
│ functions/registerInvitedEmployee.js                        │
│   ├─> Valida convite                                        │
│   ├─> Cria/Atualiza Employee                                │
│   ├─> 🔄 Busca UserProfile por job_role                     │
│   ├─> Cria User (user_status: "pending")                   │
│   │   └─> profile_id: auto-vinculado                       │
│   ├─> Vincula Employee.user_id = User.id                   │
│   └─> Atualiza convite (status: "acessado")                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. APROVAÇÃO ADMIN                                          │
├─────────────────────────────────────────────────────────────┤
│ functions/approveUserAccess.js                              │
│   ├─> Atualiza User.user_status = "active"                 │
│   ├─> Sincroniza Employee.user_status = "ativo"            │
│   ├─> Confirma profile_id                                   │
│   ├─> Registra auditoria                                    │
│   └─> Atualiza convite (status: "concluido")               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PRIMEIRO LOGIN                                           │
├─────────────────────────────────────────────────────────────┤
│ Layout.js                                                   │
│   ├─> Se user_status = "pending"                           │
│   │   └─> Exibe: "Aguardando Aprovação"                    │
│   │                                                          │
│   └─> Se user_status = "active"                            │
│       ├─> usePermissions() carrega permissões               │
│       │   ├─> Busca Employee via user_id                   │
│       │   ├─> Carrega UserProfile via profile_id           │
│       │   ├─> Carrega CustomRoles via custom_role_ids      │
│       │   └─> Agrega todas system_roles                    │
│       └─> Libera acesso à aplicação                        │
└─────────────────────────────────────────────────────────────┘`}
                    </pre>
                  </div>
                </section>

                <section>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">🔐 Fluxo 2: Verificação de Permissões</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
{`┌─────────────────────────────────────────────────────────────┐
│ USUÁRIO TENTA ACESSAR PÁGINA                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Layout.js (Verifica Acesso)                                 │
├─────────────────────────────────────────────────────────────┤
│ usePermissions().canAccessPage(currentPageName)            │
│   ↓                                                          │
│   ├─> Se Admin: return true                                 │
│   │                                                          │
│   └─> Se User comum:                                        │
│       ├─> Busca permissão necessária em pagePermissions.js │
│       │   Ex: "Colaboradores" → "employees.view"           │
│       │                                                      │
│       ├─> Verifica se user tem essa permissão:             │
│       │   hasPermission("employees.view")                  │
│       │                                                      │
│       └─> Se TEM: Renderiza página                         │
│           Se NÃO TEM: Exibe "Acesso Negado"                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ COMO hasPermission() FUNCIONA                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Busca Employee onde user_id = currentUser.id            │
│ 2. Obtém Employee.profile_id                                │
│ 3. Carrega UserProfile                                      │
│ 4. Itera sobre UserProfile.custom_role_ids                  │
│ 5. Para cada CustomRole:                                    │
│    └─> Agrega system_roles[]                               │
│ 6. Retorna array unificado:                                 │
│    ["dashboard.view", "employees.view", "employees.edit"]  │
│ 7. Verifica se array contém permissão solicitada           │
└─────────────────────────────────────────────────────────────┘`}
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
                    <h4 className="font-bold text-lg mb-2">User (Base44) - Gestão de Perfil</h4>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <p className="font-semibold text-gray-900">Atributos padrão (imutáveis):</p>
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
                        <p className="font-semibold text-gray-900">Permissões automáticas:</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li><strong>Admin</strong>: lista/edita/deleta usuários (exceto atributos padrão)</li>
                          <li><strong>User</strong>: acessa e atualiza apenas o próprio registro</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Acesso ao usuário logado:</p>
                        <p>
                          <code>base44.auth.me()</code> retorna o usuário atual. Em páginas públicas, pode retornar{" "}
                          <code>null</code> ou lançar erro conforme a configuração de proteção.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Ferramentas para o desenvolvedor:</p>
                        <ul className="list-disc ml-6 space-y-1">
                          <li><code>read_entities("User")</code> para inspecionar o schema atual</li>
                          <li>Dashboard Base44 para visualizar e gerenciar usuários</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-xs font-mono space-y-2">
                        <div>
                          <span className="font-semibold">Usuário logado:</span> <br />
                          <code>{`const user = await base44.auth.me();`}</code>
                        </div>
                        <div>
                          <span className="font-semibold">Atualizar perfil:</span> <br />
                          <code>{`await base44.auth.updateMe({ bio: "Minha nova biografia." });`}</code>
                        </div>
                        <div>
                          <span className="font-semibold">Listar usuários (admin):</span> <br />
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
                      <div><strong>job_role:</strong> enum (função do sistema)</div>
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
                      <div><strong>job_roles:</strong> string[] (funções vinculadas)</div>
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
                      <div><strong>system_roles:</strong> string[] (permissões granulares)</div>
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
                      <div><strong>invite_token:</strong> string (único)</div>
                      <div><strong>expires_at:</strong> datetime</div>
                      <div><strong>status:</strong> "enviado" | "acessado" | "concluido" | "expirado"</div>
                      <div><strong>created_user_id:</strong> string (após conclusão)</div>
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

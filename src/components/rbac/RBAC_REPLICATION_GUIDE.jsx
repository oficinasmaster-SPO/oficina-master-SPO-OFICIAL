import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, Database, Code, Settings, Users, FileText, Shield } from "lucide-react";

export default function RBACReplicationGuide() {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const entities = {
    UserProfile: `{
  "name": "UserProfile",
  "type": "object",
  "properties": {
    "user_id": { "type": "string" },
    "profile_name": { "type": "string" },
    "custom_role_id": { "type": "string" },
    "custom_permissions": {
      "type": "object",
      "properties": {
        "pages": { "type": "array", "items": { "type": "string" } },
        "sidebar_sections": { "type": "array", "items": { "type": "string" } },
        "home_widgets": { "type": "array", "items": { "type": "string" } }
      }
    },
    "is_active": { "type": "boolean", "default": true }
  },
  "required": ["user_id", "profile_name"],
  "rls": {
    "create": true,
    "read": { "$or": [{ "user_id": "{{user.id}}" }, { "user_condition": { "role": "admin" } }] },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}`,
    CustomRole: `{
  "name": "CustomRole",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "workshop_id": { "type": "string" },
    "permissions": {
      "type": "object",
      "properties": {
        "pages": { "type": "array", "items": { "type": "string" } },
        "sidebar_sections": { "type": "array", "items": { "type": "string" } },
        "home_widgets": { "type": "array", "items": { "type": "string" } }
      }
    },
    "is_system_role": { "type": "boolean", "default": false },
    "is_active": { "type": "boolean", "default": true }
  },
  "required": ["name", "permissions"],
  "rls": {
    "create": { "user_condition": { "role": "admin" } },
    "read": true,
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}`,
    PermissionChangeRequest: `{
  "name": "PermissionChangeRequest",
  "type": "object",
  "properties": {
    "user_id": { "type": "string" },
    "requested_by": { "type": "string" },
    "request_type": { "type": "string", "enum": ["add_page", "remove_page", "add_widget", "remove_widget", "change_role"] },
    "target_permission": { "type": "string" },
    "justification": { "type": "string" },
    "status": { "type": "string", "enum": ["pending", "approved", "rejected"], "default": "pending" },
    "reviewed_by": { "type": "string" },
    "reviewed_at": { "type": "string", "format": "date-time" }
  },
  "required": ["user_id", "requested_by", "request_type", "target_permission", "justification"],
  "rls": {
    "create": true,
    "read": { "$or": [{ "requested_by": "{{user.id}}" }, { "user_id": "{{user.id}}" }, { "user_condition": { "role": "admin" } }] },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}`
  };

  const backendFunction = `import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingProfiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    if (existingProfiles.length > 0) {
      return Response.json({ message: 'Profile já existe', profile: existingProfiles[0] });
    }

    const defaultPermissions = {
      pages: ["Dashboard", "MeuPerfil"],
      sidebar_sections: ["inicio"],
      home_widgets: ["welcome"]
    };

    const newProfile = await base44.entities.UserProfile.create({
      user_id: user.id,
      profile_name: "Perfil Padrão",
      custom_permissions: defaultPermissions,
      is_active: true
    });

    return Response.json({ success: true, profile: newProfile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});`;

  const hookCode = `import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function usePermissions() {
  const [userPermissions, setUserPermissions] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const user = await base44.auth.me();
        setUserRole(user.role);

        if (user.role === 'admin') {
          setUserPermissions({ pages: ["*"], sidebar_sections: ["*"], home_widgets: ["*"] });
        } else {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id, is_active: true });
          if (profiles.length > 0) {
            setUserPermissions(profiles[0].custom_permissions);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPermissions();
  }, []);

  const canAccessPage = (pageName) => {
    if (!pageName) return true;
    if (userRole === 'admin') return true;
    if (!userPermissions) return false;
    return userPermissions.pages?.includes(pageName) || userPermissions.pages?.includes("*");
  };

  return { userPermissions, userRole, loading, canAccessPage };
}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Guia de Replicação do Sistema RBAC
        </h1>
        <p className="text-gray-600">
          Instruções completas para replicar o sistema de permissões em outro app Base44
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="entities">Entidades</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="functions">Funções</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>📋 Visão Geral do Sistema RBAC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Este sistema implementa controle de acesso baseado em roles (RBAC) com as seguintes funcionalidades:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Perfis de Usuário
                  </h3>
                  <p className="text-sm text-gray-600">
                    Cada usuário tem um perfil com permissões customizadas para páginas, seções da sidebar e widgets do dashboard.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    Roles Customizadas
                  </h3>
                  <p className="text-sm text-gray-600">
                    Crie roles reutilizáveis com conjuntos de permissões pré-definidas que podem ser atribuídas a múltiplos usuários.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Solicitações de Permissão
                  </h3>
                  <p className="text-sm text-gray-600">
                    Usuários podem solicitar novas permissões que ficam pendentes de aprovação por administradores.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    Auditoria Completa
                  </h3>
                  <p className="text-sm text-gray-600">
                    Todas as alterações de permissões são registradas com timestamp, usuário responsável e detalhes da mudança.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-6">
                <h4 className="font-bold text-blue-900 mb-2">🚀 Fluxo de Implementação</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Criar 5 entidades principais no novo app</li>
                  <li>Copiar bibliotecas de configuração (lib/)</li>
                  <li>Criar hook usePermissions</li>
                  <li>Implementar funções backend</li>
                  <li>Modificar Layout para verificar permissões</li>
                  <li>Criar páginas de gestão (GestaoRBAC)</li>
                  <li>Copiar componentes da pasta rbac/</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Entidades Necessárias
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Crie estas 5 entidades no seu novo app Base44
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(entities).map(([name, schema]) => (
                  <div key={name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">{name}</h3>
                      <Badge>entities/{name}.json</Badge>
                    </div>
                    <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs">
                      <code>{schema}</code>
                    </pre>
                    <button
                      onClick={() => {
                        copyToClipboard(schema);
                        alert('Schema copiado!');
                      }}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar JSON
                    </button>
                  </div>
                ))}

                <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
                  <h4 className="font-bold text-yellow-900 mb-2">⚠️ Entidades Adicionais</h4>
                  <p className="text-sm text-yellow-800">
                    Você também precisa criar: <strong>RBACLog</strong> e <strong>ProfileTemplate</strong>.
                    Consulte o código-fonte deste projeto para os schemas completos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Hook usePermissions
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Crie este hook em: <Badge>components/hooks/usePermissions.js</Badge>
              </p>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                <code>{hookCode}</code>
              </pre>
              <button
                onClick={() => {
                  copyToClipboard(hookCode);
                  alert('Código copiado!');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Código
              </button>

              <div className="bg-green-50 border-l-4 border-green-600 p-4 mt-6">
                <h4 className="font-bold text-green-900 mb-2">✅ Como Usar</h4>
                <pre className="text-sm text-green-800 bg-green-100 p-3 rounded mt-2">
{`import { usePermissions } from "@/components/hooks/usePermissions";

function MyComponent() {
  const { canAccessPage, userRole } = usePermissions();
  
  if (!canAccessPage("Dashboard")) {
    return <div>Sem acesso</div>;
  }
  
  return <div>Conteúdo protegido</div>;
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Funções Backend
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Crie esta função em: <Badge>functions/autoAssignProfile.js</Badge>
              </p>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                <code>{backendFunction}</code>
              </pre>
              <button
                onClick={() => {
                  copyToClipboard(backendFunction);
                  alert('Código copiado!');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Código
              </button>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-6">
                <h4 className="font-bold text-blue-900 mb-2">📌 Outras Funções Necessárias</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li><strong>processPermissionRequest.js</strong> - Aprovar/rejeitar solicitações</li>
                  <li><strong>logRBACAction.js</strong> - Registrar mudanças no log de auditoria</li>
                  <li><strong>initializeSystemProfiles.js</strong> - Criar perfis padrão</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>🛡️ Modificação no Layout</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Adicione verificação de permissões no seu <Badge>Layout.js</Badge>
              </p>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm">
{`import { usePermissions } from "@/components/hooks/usePermissions";

export default function Layout({ children, currentPageName }) {
  const { canAccessPage } = usePermissions();

  // Verificar acesso à página atual
  if (isAuthenticated && currentPageName) {
    const hasAccess = canAccessPage(currentPageName);
    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <h2 className="text-2xl font-bold">Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      );
    }
  }

  return (
    // ... resto do layout
  );
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Checklist de Implementação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "Criar entidade UserProfile",
                  "Criar entidade CustomRole",
                  "Criar entidade PermissionChangeRequest",
                  "Criar entidade RBACLog",
                  "Criar entidade ProfileTemplate",
                  "Copiar lib/pagePermissions.js (adapte suas páginas)",
                  "Copiar lib/systemRoles.js (defina suas roles)",
                  "Copiar lib/sidebarStructure.js (estrutura do menu)",
                  "Criar hooks/usePermissions.js",
                  "Criar function autoAssignProfile",
                  "Criar function processPermissionRequest",
                  "Criar function logRBACAction",
                  "Modificar Layout.js com verificação canAccessPage",
                  "Criar página GestaoRBAC",
                  "Criar página SolicitarPermissoes",
                  "Copiar todos componentes da pasta components/rbac/",
                  "Testar login de novo usuário (profile automático)",
                  "Testar bloqueio de acesso sem permissão",
                  "Testar aprovação de solicitação de permissão",
                  "Verificar logs de auditoria"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-sm flex-1">{item}</span>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-4 mt-6">
                <h4 className="font-bold text-green-900 mb-2">🎉 Pós-Implementação</h4>
                <p className="text-sm text-green-800">
                  Após completar todos os itens, execute testes completos de cada funcionalidade.
                  Consulte este projeto como referência para componentes adicionais e casos de uso avançados.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
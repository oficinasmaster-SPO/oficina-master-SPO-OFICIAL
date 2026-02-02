import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Eye, FileText, BarChart3, GitPullRequest, History, Layout, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ProfilesManagement from "@/components/rbac/ProfilesManagement";
import RolesManagement from "@/components/rbac/RolesManagement";
import UserPermissionsViewer from "@/components/rbac/UserPermissionsViewer";
import DocumentacaoRBAC from "@/pages/DocumentacaoRBAC";
import RBACAnalyticsDashboard from "@/components/rbac/analytics/RBACAnalyticsDashboard";
import PendingRequestsList from "@/components/rbac/PendingRequestsList";
import AuditLogViewer from "@/components/rbac/audit/AuditLogViewer";
import ProfileTemplateManager from "@/components/rbac/templates/ProfileTemplateManager";
import RoleTemplateManager from "@/components/rbac/templates/RoleTemplateManager";
import ModuleAccessConfig from "@/components/permissions/ModuleAccessConfig";

export default function GestaoRBAC() {
  const [activeTab, setActiveTab] = useState("profiles");

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-requests-count'],
    queryFn: async () => {
      const requests = await base44.entities.PermissionChangeRequest.filter({ status: 'pendente' });
      return Array.isArray(requests) ? requests.length : 0;
    },
    refetchInterval: 30000
  });

  return (
    <PermissionGuard resource="admin" action="read">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão RBAC</h1>
            <p className="text-gray-600 mt-1">
              Gerenciamento completo de perfis e permissões do sistema
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-2">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 relative">
              <GitPullRequest className="w-4 h-4" />
              Aprovações
              {pendingCount > 0 && (
                <Badge className="ml-1 bg-orange-600 text-white h-5 min-w-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="w-4 h-4" />
              Perfis
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="user-permissions" className="gap-2">
              <Eye className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <History className="w-4 h-4" />
              Auditoria
            </TabsTrigger>
            <TabsTrigger value="profile-templates" className="gap-2">
              <Layout className="w-4 h-4" />
              Templates Perfil
            </TabsTrigger>
            <TabsTrigger value="role-templates" className="gap-2">
              <Layout className="w-4 h-4" />
              Templates Role
            </TabsTrigger>
            <TabsTrigger value="module-config" className="gap-2">
              <Settings className="w-4 h-4" />
              Config Módulos
            </TabsTrigger>
            <TabsTrigger value="documentation" className="gap-2">
              <FileText className="w-4 h-4" />
              Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <RBACAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="approvals">
            <PendingRequestsList />
          </TabsContent>

          <TabsContent value="profiles">
            <ProfilesManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="user-permissions">
            <UserPermissionsViewer />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="profile-templates">
            <ProfileTemplateManager />
          </TabsContent>

          <TabsContent value="role-templates">
            <RoleTemplateManager />
          </TabsContent>

          <TabsContent value="module-config">
            <ModuleAccessConfig />
          </TabsContent>

          <TabsContent value="documentation">
            <DocumentacaoRBAC />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Eye } from "lucide-react";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ProfilesManagement from "@/components/rbac/ProfilesManagement";
import RolesManagement from "@/components/rbac/RolesManagement";
import UserPermissionsViewer from "@/components/rbac/UserPermissionsViewer";

export default function GestaoRBAC() {
  const [activeTab, setActiveTab] = useState("profiles");

  return (
    <PermissionGuard action="gerenciar_roles">
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
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="w-4 h-4" />
              Gestão de Perfis
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Gerenciar Roles
            </TabsTrigger>
            <TabsTrigger value="user-permissions" className="gap-2">
              <Eye className="w-4 h-4" />
              Permissões por Usuário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            <ProfilesManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RolesManagement />
          </TabsContent>

          <TabsContent value="user-permissions">
            <UserPermissionsViewer />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
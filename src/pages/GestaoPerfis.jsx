import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import CustomRoleManager from "@/components/rbac/CustomRoleManager";
import UserProfileManager from "@/components/rbac/UserProfileManager";
import PendingRequestsList from "@/components/rbac/PendingRequestsList";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function GestaoPerfis() {
  const [activeTab, setActiveTab] = useState("profiles");

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['permissionRequests'],
    queryFn: () => base44.entities.PermissionChangeRequest.list(),
  });

  const pendingCount = pendingRequests.filter(r => r.status === 'pendente').length;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Perfis e Roles</h1>
        <p className="text-gray-600 mt-2">
          Configure perfis de usuário e roles customizadas com permissões granulares
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles">Perfis de Usuário</TabsTrigger>
          <TabsTrigger value="roles">Roles Customizadas</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Solicitações Pendentes
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profiles" className="mt-6">
          <UserProfileManager />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <CustomRoleManager />
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <PendingRequestsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
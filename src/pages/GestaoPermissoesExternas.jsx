import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExternalUserList from "@/components/permissions/ExternalUserManagement/ExternalUserList";
import PermissionExceptionEditor from "@/components/permissions/ExternalUserManagement/PermissionExceptionEditor";

export default function GestaoPermissoesExternas() {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: externalUsersData, isLoading } = useQuery({
    queryKey: ['external-users-by-workshop'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listExternalUsersByWorkshop', {});
      return response.data;
    }
  });

  const workshops = externalUsersData?.workshops || [];

  const filteredWorkshops = selectedWorkshopId === "all" 
    ? workshops 
    : workshops.filter(w => w.workshop_id === selectedWorkshopId);

  const totalExternalUsers = workshops.reduce((sum, w) => sum + w.external_users.length, 0);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditorOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Permissões - Clientes Externos</h1>
          <p className="text-gray-600 mt-1">Gerencie permissões individuais para usuários externos sem alterar perfis RBAC</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-1" />
            {totalExternalUsers} externos
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Building2 className="w-4 h-4 mr-1" />
            {workshops.length} oficinas
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Oficina</label>
              <Select value={selectedWorkshopId} onValueChange={setSelectedWorkshopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as oficinas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as oficinas</SelectItem>
                  {workshops.map(w => (
                    <SelectItem key={w.workshop_id} value={w.workshop_id}>
                      {w.workshop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Usuários</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {filteredWorkshops.map(workshop => (
            <Card key={workshop.workshop_id}>
              <CardHeader>
                <CardTitle className="text-lg">{workshop.workshop_name}</CardTitle>
                <p className="text-sm text-gray-600">
                  {workshop.external_users.length} usuário(s) externo(s)
                </p>
              </CardHeader>
              <CardContent>
                <ExternalUserList 
                  users={workshop.external_users}
                  onEditUser={handleEditUser}
                />
              </CardContent>
            </Card>
          ))}

          {filteredWorkshops.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum usuário externo encontrado</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">Em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isEditorOpen && selectedUser && (
        <PermissionExceptionEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          user={selectedUser}
        />
      )}
    </div>
  );
}
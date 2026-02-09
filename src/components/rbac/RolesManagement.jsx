import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RoleFormDialog from "@/components/roles/RoleFormDialog";
import SystemRolesReference from "@/components/roles/SystemRolesReference";

export default function RolesManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const roles = await base44.entities.CustomRole.list();
      return roles || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role criada com sucesso");
      setShowDialog(false);
      setEditingRole(null);
    },
    onError: (error) => {
      toast.error("Erro ao criar role: " + error.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomRole.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role atualizada");
      setShowDialog(false);
      setEditingRole(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar role: " + error.message);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role excluída");
    },
    onError: (error) => {
      toast.error("Erro ao excluir role: " + error.message);
    },
  });

  const getUsersCountByRole = (roleId) => {
    return users.filter(u => u.custom_role_id === roleId).length;
  };

  const filteredRoles = customRoles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingRole(null);
    setShowDialog(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setShowDialog(true);
  };

  const handleDelete = (role) => {
    const usersCount = getUsersCountByRole(role.id);
    if (usersCount > 0) {
      toast.error("Role possui usuários vinculados");
      return;
    }
    if (confirm(`Excluir role "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleSave = (data) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data });
    } else {
      createRoleMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold">{customRoles.length}</p>
              <p className="text-sm text-gray-600">Roles Customizadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto text-purple-600 mb-2" />
              <p className="text-3xl font-bold">
                {users.filter(u => u.custom_role_id).length}
              </p>
              <p className="text-sm text-gray-600">Usuários Atribuídos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">
                {customRoles.filter(r => r.status === 'ativo').length}
              </p>
              <p className="text-sm text-gray-600">Roles Ativas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleCreateNew} className="gap-2">
        <Plus className="w-4 h-4" />
        Nova Role
      </Button>

      <SystemRolesReference />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Roles Customizadas</CardTitle>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRoles.map((role) => {
              const usersCount = getUsersCountByRole(role.id);
              return (
                <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{role.name}</h3>
                      <Badge variant={role.status === 'ativo' ? 'default' : 'secondary'}>
                        {role.status}
                      </Badge>
                      <Badge variant="outline">{role.system_roles?.length || 0} permissões</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{usersCount} usuários</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(role)} variant="outline" size="sm" className="gap-2">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => handleDelete(role)} 
                      variant="destructive" 
                      size="sm"
                      disabled={usersCount > 0}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredRoles.length === 0 && (
              <p className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhuma role encontrada" : "Nenhuma role customizada criada"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditingRole(null); }}
        role={editingRole}
        onSave={handleSave}
        isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
      />
    </div>
  );
}
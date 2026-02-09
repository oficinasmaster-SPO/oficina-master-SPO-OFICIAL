import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CustomRoleForm from "./CustomRoleForm";
import CustomRoleList from "./CustomRoleList";

export default function CustomRoleManager() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['userProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (newRole) => base44.entities.CustomRole.create(newRole),
    onSuccess: () => {
      queryClient.invalidateQueries(['customRoles']);
      toast.success("Role customizada criada com sucesso!");
      setIsFormOpen(false);
      setEditingRole(null);
    },
    onError: (err) => {
      toast.error("Erro ao criar role customizada: " + err.message);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, updatedRole }) => base44.entities.CustomRole.update(id, updatedRole),
    onSuccess: () => {
      queryClient.invalidateQueries(['customRoles']);
      toast.success("Role customizada atualizada com sucesso!");
      setIsFormOpen(false);
      setEditingRole(null);
    },
    onError: (err) => {
      toast.error("Erro ao atualizar role customizada: " + err.message);
    },
  });

  const cloneRoleMutation = useMutation({
    mutationFn: (roleToClone) => {
      const clonedData = {
        name: `${roleToClone.name} (Cópia)`,
        description: roleToClone.description,
        system_roles: roleToClone.system_roles || [],
        entity_permissions: roleToClone.entity_permissions || {},
        status: 'ativo'
      };
      return base44.entities.CustomRole.create(clonedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customRoles']);
      toast.success("Role clonada com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao clonar role: " + err.message);
    },
  });

  const handleSaveRole = (roleData) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, updatedRole: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleCloneRole = (role) => {
    if (confirm(`Deseja clonar a role "${role.name}"?`)) {
      cloneRoleMutation.mutate(role);
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || role.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDependencies = (roleId) => {
    return profiles.filter(p => p.custom_role_ids?.includes(roleId));
  };

  if (isLoading) return <div className="text-center p-4">Carregando roles customizadas...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erro ao carregar roles: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Gerenciar Roles Customizadas</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingRole(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Editar Role Customizada" : "Criar Nova Role Customizada"}</DialogTitle>
            </DialogHeader>
            <CustomRoleForm 
              initialData={editingRole} 
              onSave={handleSaveRole} 
              onCancel={() => setIsFormOpen(false)} 
              isSaving={createRoleMutation.isPending || updateRoleMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativas</option>
          <option value="inativo">Inativas</option>
        </select>
      </div>

      <CustomRoleList 
        roles={filteredRoles} 
        onEdit={handleEditRole}
        onClone={handleCloneRole}
        getDependencies={getDependencies}
      />
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import UserProfileForm from "./UserProfileForm";
import UserProfileList from "./UserProfileList";

export default function UserProfileManager() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['userProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createProfileMutation = useMutation({
    mutationFn: (newProfile) => base44.entities.UserProfile.create(newProfile),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfiles']);
      toast.success("Perfil de usuário criado com sucesso!");
      setIsFormOpen(false);
      setEditingProfile(null);
    },
    onError: (err) => {
      toast.error("Erro ao criar perfil de usuário: " + err.message);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, updatedProfile }) => base44.entities.UserProfile.update(id, updatedProfile),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfiles']);
      toast.success("Perfil de usuário atualizado com sucesso!");
      setIsFormOpen(false);
      setEditingProfile(null);
    },
    onError: (err) => {
      toast.error("Erro ao atualizar perfil de usuário: " + err.message);
    },
  });

  const cloneProfileMutation = useMutation({
    mutationFn: (profileToClone) => {
      const clonedData = {
        name: `${profileToClone.name} (Cópia)`,
        description: profileToClone.description,
        type: profileToClone.type,
        permission_type: profileToClone.permission_type,
        custom_role_ids: profileToClone.custom_role_ids || [],
        job_roles: profileToClone.job_roles || [],
        status: 'ativo',
        sidebar_permissions: profileToClone.sidebar_permissions || {},
        module_permissions: profileToClone.module_permissions || {},
        roles: profileToClone.roles || []
      };
      return base44.entities.UserProfile.create(clonedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfiles']);
      toast.success("Perfil clonado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao clonar perfil: " + err.message);
    },
  });

  const handleSaveProfile = (profileData) => {
    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, updatedProfile: profileData });
    } else {
      createProfileMutation.mutate(profileData);
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleCloneProfile = (profile) => {
    if (confirm(`Deseja clonar o perfil "${profile.name}"?`)) {
      cloneProfileMutation.mutate(profile);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "todos" || profile.type === typeFilter;
    const matchesStatus = statusFilter === "todos" || profile.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getUserCount = (profileId) => {
    return employees.filter(e => e.profile_id === profileId).length;
  };

  if (isLoading) return <div className="text-center p-4">Carregando perfis de usuário...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erro ao carregar perfis: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Gerenciar Perfis de Usuário</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProfile(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Editar Perfil de Usuário" : "Criar Novo Perfil de Usuário"}</DialogTitle>
            </DialogHeader>
            <UserProfileForm 
              initialData={editingProfile} 
              onSave={handleSaveProfile} 
              onCancel={() => setIsFormOpen(false)} 
              isSaving={createProfileMutation.isPending || updateProfileMutation.isPending}
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="interno">Interno</option>
          <option value="externo">Externo</option>
          <option value="sistema">Sistema</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <UserProfileList 
        profiles={filteredProfiles} 
        onEdit={handleEditProfile}
        onClone={handleCloneProfile}
        getUserCount={getUserCount}
      />
    </div>
  );
}
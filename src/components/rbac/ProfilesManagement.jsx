import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, Power, Trash2, Shield, AlertCircle, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ProfileEditor from "@/components/profiles/ProfileEditor";
import ProfileCreator from "@/components/profiles/ProfileCreator";
import ProfileAudit from "@/components/profiles/ProfileAudit";
import { systemRoles } from "@/components/lib/systemRoles";

export default function ProfilesManagement() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const data = await base44.entities.UserProfile.list();
      return data || [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const totalSystemRoles = systemRoles.reduce((sum, m) => sum + m.roles.length, 0);

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => 
      base44.entities.UserProfile.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Status atualizado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil excluído");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (profile) => {
      const { id, created_date, updated_date, ...data } = profile;
      return base44.entities.UserProfile.create({
        ...data,
        name: `${data.name} (Cópia)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil duplicado");
    },
  });

  const getUsersCountByProfile = (profileId) => {
    return users.filter(u => u.profile_id === profileId).length;
  };

  const handleEdit = (profile) => {
    setSelectedProfile(profile);
    setViewMode("edit");
  };

  const handleDuplicate = (profile) => {
    if (confirm(`Duplicar perfil "${profile.name}"?`)) {
      duplicateMutation.mutate(profile);
    }
  };

  const handleToggleStatus = (profile) => {
    const newStatus = profile.status === 'ativo' ? 'inativo' : 'ativo';
    toggleStatusMutation.mutate({ id: profile.id, status: newStatus });
  };

  const handleDelete = (profile) => {
    const usersCount = getUsersCountByProfile(profile.id);
    if (usersCount > 0) {
      toast.error(`Perfil possui ${usersCount} usuário(s) vinculado(s)`);
      return;
    }
    if (confirm(`Excluir perfil "${profile.name}"?`)) {
      deleteMutation.mutate(profile.id);
    }
  };

  if (viewMode === "edit" && selectedProfile) {
    return (
      <ProfileEditor
        profile={selectedProfile}
        onBack={() => {
          setViewMode("list");
          setSelectedProfile(null);
        }}
        onSave={() => {
          setViewMode("list");
          setSelectedProfile(null);
        }}
      />
    );
  }

  if (showCreator) {
    return (
      <ProfileCreator
        onBack={() => setShowCreator(false)}
        onCreate={() => setShowCreator(false)}
      />
    );
  }

  if (viewMode === "audit") {
    return <ProfileAudit profiles={profiles} onBack={() => setViewMode("list")} />;
  }

  const internalProfiles = (profiles || []).filter(p => p.type === 'interno' || p.is_internal);
  const externalProfiles = (profiles || []).filter(p => p.type === 'externo' && !p.is_internal);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold">{profiles.length}</p>
              <p className="text-sm text-gray-600">Perfis Criados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto text-purple-600 mb-2" />
              <p className="text-3xl font-bold">{users.length}</p>
              <p className="text-sm text-gray-600">Usuários no Sistema</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">{totalSystemRoles}</p>
              <p className="text-sm text-gray-600">Permissões Disponíveis</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setShowCreator(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Perfil
        </Button>
        <Button onClick={() => setViewMode("audit")} variant="outline" className="gap-2">
          <AlertCircle className="w-4 h-4" />
          Auditoria
        </Button>
      </div>

      <ProfileSection
        title="Perfis Internos"
        subtitle="Consultores, mentores e aceleradores"
        profiles={internalProfiles}
        users={users}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        getUsersCount={getUsersCountByProfile}
      />

      <ProfileSection
        title="Perfis Externos"
        subtitle="Clientes e colaboradores de oficinas"
        profiles={externalProfiles}
        users={users}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        getUsersCount={getUsersCountByProfile}
      />
    </div>
  );
}

function ProfileSection({ title, subtitle, profiles, users, onEdit, onDuplicate, onToggleStatus, onDelete, getUsersCount }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {profiles.map((profile) => {
            const usersCount = getUsersCount(profile.id);
            return (
              <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{profile.name}</h3>
                    <Badge variant={profile.status === 'ativo' ? 'default' : 'secondary'}>
                      {profile.status}
                    </Badge>
                    <Badge variant="outline">{profile.roles?.length || 0} roles</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{profile.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{usersCount} usuários</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onEdit(profile)} variant="outline" size="sm" className="gap-2">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => onDuplicate(profile)} variant="outline" size="sm" className="gap-2">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => onToggleStatus(profile)} variant="outline" size="sm" className="gap-2">
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={() => onDelete(profile)} 
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
          {profiles.length === 0 && (
            <p className="text-center py-8 text-gray-500">Nenhum perfil criado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
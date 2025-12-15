import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, Power, Trash2, Shield, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import ProfileEditor from "@/components/profiles/ProfileEditor";
import ProfileCreator from "@/components/profiles/ProfileCreator";
import ProfileAudit from "@/components/profiles/ProfileAudit";

export default function GestaoPerfis() {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // list, edit, audit
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil excluído com sucesso");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.UserProfile.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Status atualizado");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (profile) => {
      const newProfile = {
        ...profile,
        name: `${profile.name} (Cópia)`,
        cloned_from: profile.id,
        users_count: 0,
      };
      delete newProfile.id;
      delete newProfile.created_date;
      delete newProfile.updated_date;
      return base44.entities.UserProfile.create(newProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["user-profiles"]);
      toast.success("Perfil duplicado com sucesso");
    },
  });

  const internalProfiles = profiles.filter((p) => p.type === "interno");
  const externalProfiles = profiles.filter((p) => p.type === "externo");

  const getUsersCountByProfile = (profileId) => {
    return users.filter((u) => u.profile_id === profileId).length;
  };

  const handleEdit = (profile) => {
    setSelectedProfile(profile);
    setViewMode("edit");
  };

  const handleDelete = (profile) => {
    if (getUsersCountByProfile(profile.id) > 0) {
      toast.error("Não é possível excluir perfil com usuários vinculados");
      return;
    }
    if (confirm(`Deseja realmente excluir o perfil "${profile.name}"?`)) {
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
      />
    );
  }

  if (viewMode === "audit") {
    return (
      <ProfileAudit onBack={() => setViewMode("list")} profiles={profiles} />
    );
  }

  if (showCreator) {
    return (
      <ProfileCreator
        onBack={() => setShowCreator(false)}
        onCreated={(newProfile) => {
          setShowCreator(false);
          handleEdit(newProfile);
        }}
        profiles={profiles}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestão de Perfis
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie perfis e permissões do sistema de forma centralizada
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setViewMode("audit")}
            variant="outline"
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Auditoria
          </Button>
          <Button onClick={() => setShowCreator(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Novo Perfil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {profiles.length}
              </p>
              <p className="text-sm text-gray-600">Perfis Totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {internalProfiles.length}
              </p>
              <p className="text-sm text-gray-600">Perfis Internos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto text-purple-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {externalProfiles.length}
              </p>
              <p className="text-sm text-gray-600">Perfis Externos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProfileSection
        title="Perfis Internos"
        profiles={internalProfiles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={(p) => duplicateMutation.mutate(p)}
        onToggleStatus={(p) =>
          toggleStatusMutation.mutate({
            id: p.id,
            status: p.status === "ativo" ? "inativo" : "ativo",
          })
        }
        getUsersCount={getUsersCountByProfile}
      />

      <ProfileSection
        title="Perfis Externos"
        profiles={externalProfiles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={(p) => duplicateMutation.mutate(p)}
        onToggleStatus={(p) =>
          toggleStatusMutation.mutate({
            id: p.id,
            status: p.status === "ativo" ? "inativo" : "ativo",
          })
        }
        getUsersCount={getUsersCountByProfile}
      />
    </div>
  );
}

function ProfileSection({
  title,
  profiles,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
  getUsersCount,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {profiles.map((profile) => {
            const usersCount = getUsersCount(profile.id);
            return (
              <div
                key={profile.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">
                      {profile.name}
                    </h3>
                    <Badge
                      variant={
                        profile.status === "ativo" ? "default" : "secondary"
                      }
                    >
                      {profile.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {profile.description || "Sem descrição"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {usersCount} {usersCount === 1 ? "usuário" : "usuários"}{" "}
                    vinculado{usersCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onEdit(profile)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => onDuplicate(profile)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => onToggleStatus(profile)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => onDelete(profile)}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    disabled={usersCount > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {profiles.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Nenhum perfil encontrado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
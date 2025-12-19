import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Copy, Power, Trash2, Shield, AlertCircle, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProfileEditor from "@/components/profiles/ProfileEditor";
import ProfileCreator from "@/components/profiles/ProfileCreator";
import ProfileAudit from "@/components/profiles/ProfileAudit";
import { systemRoles } from "@/components/lib/systemRoles";

export default function GestaoPerfis() {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // list, edit, audit
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  // Inicializar perfis padrão do sistema
  React.useEffect(() => {
    const initProfiles = async () => {
      if (profiles.length === 0 && !isLoading) {
        try {
          await base44.functions.invoke('initializeSystemProfiles', {});
          refetch();
        } catch (error) {
          console.error("Erro ao inicializar perfis:", error);
        }
      }
    };
    initProfiles();
  }, [profiles.length, isLoading]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Calcular total de roles disponíveis no sistema
  const totalSystemRoles = systemRoles.reduce((sum, m) => sum + m.roles.length, 0);

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
      // Verificar se já existe perfil com mesmo nome
      const existingName = profiles.find(p => p.name === `${profile.name} (Cópia)`);
      const copyNumber = existingName ? ` ${profiles.filter(p => p.name.startsWith(profile.name)).length}` : '';
      
      const newProfile = {
        ...profile,
        name: `${profile.name} (Cópia)${copyNumber}`,
        cloned_from: profile.id,
        users_count: 0,
        is_system: false,
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
    if (profile.is_system) {
      toast.error("Perfis do sistema não podem ser excluídos");
      return;
    }
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

  if (viewMode === "roles") {
    // Redirecionar para página dedicada
    navigate(createPageUrl("GerenciarRoles"));
    return null;
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
            onClick={() => navigate(createPageUrl("GerenciarRoles"))}
            variant="outline"
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            Gerenciar Roles
          </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 mx-auto text-orange-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {totalSystemRoles}
              </p>
              <p className="text-sm text-gray-600">Roles Disponíveis</p>
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
                  <div className="flex items-center gap-3 flex-wrap">
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
                    {profile.is_system && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Sistema
                      </Badge>
                    )}
                    {profile.roles && profile.roles.length > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {profile.roles.length} roles
                      </Badge>
                    )}
                    {profile.job_roles && profile.job_roles.length > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {profile.job_roles.length} funções
                      </Badge>
                    )}
                    {profile.permission_type && (
                      <Badge variant="outline" className={profile.permission_type === "job_role" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}>
                        {profile.permission_type === "job_role" ? "Job Role" : "Role"}
                      </Badge>
                    )}
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
                    disabled={usersCount > 0 || profile.is_system}
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

// RolesManagement movido para pages/GerenciarRoles.js

function RolesManagementDeprecated({ onBack, customRoles, users }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role criada com sucesso");
      setShowDialog(false);
      setEditingRole(null);
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
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role excluída");
    },
  });

  const getUsersCountByRole = (roleId) => {
    return users.filter(u => u.custom_role_id === roleId).length;
  };

  const filteredRoles = customRoles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSystemRoles = systemRoles.reduce((sum, m) => sum + m.roles.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Voltar aos Perfis
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Roles</h1>
          <p className="text-gray-600 mt-1">
            Crie e gerencie roles customizadas com permissões específicas
          </p>
        </div>
        <Button onClick={() => {
          setEditingRole(null);
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Role
        </Button>
      </div>

      {/* Stats */}
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
              <Shield className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold">{totalSystemRoles}</p>
              <p className="text-sm text-gray-600">Roles do Sistema</p>
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
      </div>

      {/* System Roles Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Roles do Sistema</CardTitle>
          <p className="text-sm text-gray-600">
            Roles nativas que podem ser combinadas em perfis customizados
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {systemRoles.map((module) => (
              <div key={module.id} className="border rounded-lg">
                <button
                  onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <module.icon className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">{module.name}</span>
                    <Badge variant="outline">{module.roles.length} roles</Badge>
                  </div>
                  {expandedModule === module.id ? "▼" : "▶"}
                </button>
                {expandedModule === module.id && (
                  <div className="border-t p-4 bg-gray-50 space-y-2">
                    {module.roles.map((role) => (
                      <div key={role.id} className="bg-white p-3 rounded border">
                        <p className="font-medium text-sm">{role.name}</p>
                        <p className="text-xs text-gray-600">{role.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
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
                <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{role.name}</h3>
                      <Badge>{role.status}</Badge>
                      <Badge variant="outline">{role.system_roles?.length || 0} roles</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{usersCount} usuários</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { setEditingRole(role); setShowDialog(true); }} variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => {
                        if (usersCount > 0) {
                          toast.error("Role possui usuários vinculados");
                          return;
                        }
                        if (confirm(`Excluir "${role.name}"?`)) {
                          deleteRoleMutation.mutate(role.id);
                        }
                      }} 
                      variant="destructive" 
                      size="sm"
                      disabled={usersCount > 0}
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
        onSave={(data) => {
          if (editingRole) {
            updateRoleMutation.mutate({ id: editingRole.id, data });
          } else {
            createRoleMutation.mutate(data);
          }
        }}
        isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
      />
    </div>
  );
}

function RoleFormDialog({ open, onClose, role, onSave, isLoading }) {
  const [formData, setFormData] = useState({ name: "", description: "", system_roles: [], status: "ativo" });
  const [selectedModule, setSelectedModule] = useState(null);

  React.useEffect(() => {
    if (role) {
      setFormData(role);
    } else {
      setFormData({ name: "", description: "", system_roles: [], status: "ativo" });
    }
  }, [role, open]);

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      system_roles: prev.system_roles.includes(roleId)
        ? prev.system_roles.filter(r => r !== roleId)
        : [...prev.system_roles, roleId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Role" : "Nova Role"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          </div>
          <div>
            <Label>Permissões ({formData.system_roles.length} selecionadas)</Label>
            <div className="border rounded p-3 max-h-96 overflow-y-auto space-y-2">
              {systemRoles.map(module => (
                <div key={module.id} className="border rounded">
                  <button type="button" onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)} className="w-full flex justify-between p-2 hover:bg-gray-50">
                    <span className="font-medium text-sm">{module.name}</span>
                    {selectedModule === module.id ? "▼" : "▶"}
                  </button>
                  {selectedModule === module.id && (
                    <div className="border-t p-2 space-y-1">
                      {module.roles.map(r => (
                        <label key={r.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input type="checkbox" checked={formData.system_roles.includes(r.id)} onChange={() => toggleRole(r.id)} />
                          <div>
                            <p className="text-sm font-medium">{r.name}</p>
                            <p className="text-xs text-gray-600">{r.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
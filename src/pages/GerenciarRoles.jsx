import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, Plus, Edit, Trash2, Copy, Users, Search, 
  ChevronDown, ChevronRight, X 
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { systemRoles } from "@/components/lib/systemRoles";

export default function GerenciarRoles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const roles = await base44.entities.CustomRole.list();
      return roles || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-roles"],
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            Gerenciamento de Roles
          </h1>
          <p className="text-gray-600 mt-2">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">{customRoles.length}</p>
              <p className="text-sm text-gray-600">Roles Customizadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-10 h-10 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">{totalSystemRoles}</p>
              <p className="text-sm text-gray-600">Roles do Sistema</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto text-purple-600 mb-2" />
              <p className="text-3xl font-bold text-gray-900">
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
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles do Sistema Disponíveis
          </CardTitle>
          <p className="text-sm text-gray-600">
            Roles nativas da plataforma que podem ser combinadas em perfis customizados
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
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{module.name}</p>
                      <p className="text-xs text-gray-600">{module.roles.length} roles disponíveis</p>
                    </div>
                  </div>
                  {expandedModule === module.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedModule === module.id && (
                  <div className="border-t p-4 bg-gray-50 space-y-2">
                    {module.roles.map((role) => (
                      <div key={role.id} className="bg-white p-3 rounded border">
                        <p className="font-medium text-sm">{role.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                        <div className="flex gap-1 mt-2">
                          {role.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Roles Customizadas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar roles..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredRoles.map((role) => {
              const usersCount = getUsersCountByRole(role.id);
              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <Badge variant={role.status === "ativo" ? "default" : "secondary"}>
                        {role.status}
                      </Badge>
                      {role.system_roles && role.system_roles.length > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {role.system_roles.length} roles
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {role.description || "Sem descrição"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      <Users className="w-3 h-3 inline mr-1" />
                      {usersCount} {usersCount === 1 ? "usuário" : "usuários"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditingRole(role);
                        setShowDialog(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        const newRole = {
                          ...role,
                          name: `${role.name} (Cópia)`,
                        };
                        delete newRole.id;
                        delete newRole.created_date;
                        delete newRole.updated_date;
                        createRoleMutation.mutate(newRole);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        if (usersCount > 0) {
                          toast.error("Não é possível excluir role com usuários vinculados");
                          return;
                        }
                        if (confirm(`Excluir role "${role.name}"?`)) {
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
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? "Nenhuma role encontrada" : "Nenhuma role customizada criada"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <RoleFormDialog
        open={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingRole(null);
        }}
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_roles: [],
    status: "ativo",
  });

  const [selectedModule, setSelectedModule] = useState(null);

  React.useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || "",
        description: role.description || "",
        system_roles: role.system_roles || [],
        status: role.status || "ativo",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        system_roles: [],
        status: "ativo",
      });
    }
  }, [role, open]);

  const toggleSystemRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      system_roles: prev.system_roles.includes(roleId)
        ? prev.system_roles.filter(r => r !== roleId)
        : [...prev.system_roles, roleId]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? "Editar Role" : "Criar Nova Role"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nome da Role *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Gerente de Loja"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva as responsabilidades desta role..."
                rows={3}
              />
            </div>

            <div>
              <Label>Selecionar Permissões (System Roles)</Label>
              <p className="text-xs text-gray-600 mb-3">
                {formData.system_roles.length} roles selecionadas
              </p>
              <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                {systemRoles.map((module) => (
                  <div key={module.id} className="border rounded">
                    <button
                      type="button"
                      onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <module.icon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">{module.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {module.roles.filter(r => formData.system_roles.includes(r.id)).length}/
                          {module.roles.length}
                        </Badge>
                      </div>
                      {selectedModule === module.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {selectedModule === module.id && (
                      <div className="border-t p-3 space-y-2 bg-gray-50">
                        {module.roles.map((sysRole) => (
                          <label
                            key={sysRole.id}
                            className="flex items-start gap-3 p-2 hover:bg-white rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.system_roles.includes(sysRole.id)}
                              onChange={() => toggleSystemRole(sysRole.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{sysRole.name}</p>
                              <p className="text-xs text-gray-600">{sysRole.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : role ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
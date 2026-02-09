import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, AlertCircle, Plus, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { systemRoles } from "@/components/lib/systemRoles";

export default function CustomRoleSelector({ profile, onChange }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPermissionsDetail, setShowPermissionsDetail] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "", system_roles: [] });
  const [expandedModule, setExpandedModule] = useState(null);

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const roles = await base44.entities.CustomRole.filter({ status: "ativo" });
      return roles || [];
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomRole.create(data),
    onSuccess: (createdRole) => {
      queryClient.invalidateQueries(["custom-roles"]);
      toast.success("Role criada com sucesso");
      setShowCreateDialog(false);
      setNewRole({ name: "", description: "", system_roles: [] });
      
      // Auto-selecionar a role criada
      onChange({
        ...profile,
        custom_role_ids: [...(profile.custom_role_ids || []), createdRole.id],
      });
    },
  });

  const selectedRoleIds = profile.custom_role_ids || [];

  const toggleRole = (roleId) => {
    const updated = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];

    onChange({
      ...profile,
      custom_role_ids: updated,
    });
  };

  const toggleSystemRole = (roleId) => {
    const updated = newRole.system_roles.includes(roleId)
      ? newRole.system_roles.filter((id) => id !== roleId)
      : [...newRole.system_roles, roleId];
    setNewRole({ ...newRole, system_roles: updated });
  };

  const handleCreateRole = () => {
    if (!newRole.name) {
      toast.error("Nome da role é obrigatório");
      return;
    }
    createRoleMutation.mutate({ ...newRole, status: "ativo" });
  };

  const selectedRoles = customRoles.filter((r) => selectedRoleIds.includes(r.id));
  const totalPermissions = selectedRoles.reduce(
    (sum, role) => sum + (role.system_roles?.length || 0),
    0
  );

  // Agrupar permissões por módulo
  const permissionsByModule = selectedRoles.reduce((acc, role) => {
    (role.system_roles || []).forEach((sysRoleId) => {
      systemRoles.forEach((module) => {
        const foundRole = module.roles.find((r) => r.id === sysRoleId);
        if (foundRole) {
          if (!acc[module.name]) {
            acc[module.name] = { icon: module.icon, roles: [] };
          }
          if (!acc[module.name].roles.find((r) => r.id === foundRole.id)) {
            acc[module.name].roles.push(foundRole);
          }
        }
      });
    });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Roles Customizadas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Atribua roles customizadas para este perfil
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Nova Role
              </Button>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{selectedRoleIds.length}</p>
                <p className="text-xs text-gray-600">roles selecionadas</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma role customizada disponível</p>
              <p className="text-sm text-gray-500 mt-2">
                Clique em "Criar Nova Role" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`role-${role.id}`}
                      className="font-medium text-gray-900 cursor-pointer"
                    >
                      {role.name}
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {role.description || "Sem descrição"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">
                        {role.system_roles?.length || 0} permissões
                      </Badge>
                      <Badge variant={role.status === "ativo" ? "default" : "secondary"}>
                        {role.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRoleIds.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Resumo das Permissões Herdadas
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {selectedRoleIds.length} role(s) selecionada(s) •{" "}
                    {totalPermissions} permissão(ões) do sistema ativas
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedRoles.map((role) => (
                      <Badge key={role.id} className="bg-blue-100 text-blue-800">
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowPermissionsDetail(true)}
                size="sm"
                variant="outline"
                className="bg-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Create Role */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Role Customizada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Role *</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="Ex: Gerente de Vendas"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Descreva as responsabilidades desta role"
                rows={3}
              />
            </div>
            <div>
              <Label>Permissões do Sistema ({newRole.system_roles.length} selecionadas)</Label>
              <div className="border rounded-lg max-h-96 overflow-y-auto mt-2">
                {systemRoles.map((module) => (
                  <div key={module.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <module.icon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">{module.name}</span>
                        <Badge variant="outline">{module.roles.length}</Badge>
                      </div>
                      {expandedModule === module.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedModule === module.id && (
                      <div className="p-3 bg-gray-50 space-y-2">
                        {module.roles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={newRole.system_roles.includes(role.id)}
                              onCheckedChange={() => toggleSystemRole(role.id)}
                            />
                            <div>
                              <p className="text-sm font-medium">{role.name}</p>
                              <p className="text-xs text-gray-600">{role.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateRole}
                disabled={createRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? "Criando..." : "Criar Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Permissions Detail */}
      <Dialog open={showPermissionsDetail} onOpenChange={setShowPermissionsDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes das Permissões Herdadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.entries(permissionsByModule).length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                Nenhuma permissão herdada
              </p>
            ) : (
              Object.entries(permissionsByModule).map(([moduleName, data]) => {
                const ModuleIcon = data.icon;
                return (
                  <Card key={moduleName}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ModuleIcon className="w-5 h-5 text-blue-600" />
                        {moduleName}
                        <Badge variant="outline">{data.roles.length} permissões</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.roles.map((role) => (
                          <div key={role.id} className="p-3 border rounded-lg bg-gray-50">
                            <p className="font-medium text-sm">{role.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {role.permissions.map((perm) => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
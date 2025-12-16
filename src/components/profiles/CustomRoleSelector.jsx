import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function CustomRoleSelector({ profile, onChange }) {
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const roles = await base44.entities.CustomRole.filter({ status: "ativo" });
      return roles || [];
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

  const selectedRoles = customRoles.filter((r) => selectedRoleIds.includes(r.id));
  const totalPermissions = selectedRoles.reduce(
    (sum, role) => sum + (role.system_roles?.length || 0),
    0
  );

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
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{selectedRoleIds.length}</p>
              <p className="text-xs text-gray-600">roles selecionadas</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma role customizada disponível</p>
              <p className="text-sm text-gray-500 mt-2">
                Crie roles customizadas na seção de gestão de roles
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
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">
                  Resumo das Permissões
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
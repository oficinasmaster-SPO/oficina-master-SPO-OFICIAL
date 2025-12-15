import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";

export default function RoleManager({ profile, onChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedModules, setExpandedModules] = useState([]);
  
  const profileRoles = profile.roles || [];

  const toggleRole = (roleId) => {
    const updated = profileRoles.includes(roleId)
      ? profileRoles.filter((r) => r !== roleId)
      : [...profileRoles, roleId];
    
    onChange({
      ...profile,
      roles: updated,
    });
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const selectAllModuleRoles = (moduleRoles, select) => {
    const moduleRoleIds = moduleRoles.map((r) => r.id);
    const updated = select
      ? [...new Set([...profileRoles, ...moduleRoleIds])]
      : profileRoles.filter((r) => !moduleRoleIds.includes(r));
    
    onChange({
      ...profile,
      roles: updated,
    });
  };

  const filteredRoles = systemRoles.map((module) => ({
    ...module,
    roles: module.roles.filter(
      (role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((module) => module.roles.length > 0);

  const totalRoles = systemRoles.reduce((sum, m) => sum + m.roles.length, 0);
  const selectedRoles = profileRoles.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão de Roles</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Selecione as roles que este perfil terá acesso
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{selectedRoles}</p>
                <p className="text-xs text-gray-600">de {totalRoles} roles</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar roles..."
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredRoles.map((module) => {
              const moduleRoleIds = module.roles.map((r) => r.id);
              const selectedCount = moduleRoleIds.filter((id) =>
                profileRoles.includes(id)
              ).length;
              const isExpanded = expandedModules.includes(module.id);

              return (
                <Card key={module.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="hover:bg-gray-100 p-2 rounded"
                        >
                          <module.icon className="w-5 h-5 text-blue-600" />
                        </button>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {module.name}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {selectedCount} de {module.roles.length} roles selecionadas
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedCount > 0 ? "default" : "outline"}>
                          {selectedCount}/{module.roles.length}
                        </Badge>
                        <button
                          onClick={() => selectAllModuleRoles(module.roles, selectedCount === 0)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {selectedCount === module.roles.length ? "Desmarcar" : "Marcar"} todas
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="space-y-2">
                        {module.roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <Checkbox
                              id={role.id}
                              checked={profileRoles.includes(role.id)}
                              onCheckedChange={() => toggleRole(role.id)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={role.id} className="font-medium text-sm">
                                {role.name}
                              </Label>
                              <p className="text-xs text-gray-600 mt-1">
                                {role.description}
                              </p>
                              <div className="flex gap-2 mt-2">
                                {role.permissions.map((perm) => (
                                  <Badge key={perm} variant="outline" className="text-xs">
                                    {perm}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma role encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
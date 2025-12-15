import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { jobRoles, jobRoleCategories } from "@/components/lib/jobRoles";
import { Users } from "lucide-react";

export default function JobRoleManager({ profile, onChange }) {
  const profileJobRoles = profile.job_roles || [];

  const toggleJobRole = (roleValue) => {
    const updated = profileJobRoles.includes(roleValue)
      ? profileJobRoles.filter((r) => r !== roleValue)
      : [...profileJobRoles, roleValue];
    
    onChange({
      ...profile,
      job_roles: updated,
    });
  };

  const selectAllCategory = (category, select) => {
    const categoryRoles = jobRoles.filter(jr => jr.category === category).map(r => r.value);
    const updated = select
      ? [...new Set([...profileJobRoles, ...categoryRoles])]
      : profileJobRoles.filter((r) => !categoryRoles.includes(r));
    
    onChange({
      ...profile,
      job_roles: updated,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Funções Vinculadas (job_role)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Colaboradores com estas funções receberão este perfil automaticamente
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">{profileJobRoles.length}</p>
              <p className="text-xs text-gray-600">de {jobRoles.length} funções</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(jobRoleCategories).map(([cat, catData]) => {
              const categoryRoles = jobRoles.filter(jr => jr.category === cat);
              const selectedCount = categoryRoles.filter(r => 
                profileJobRoles.includes(r.value)
              ).length;

              return (
                <Card key={cat} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {catData.label}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {selectedCount} de {categoryRoles.length} selecionadas
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedCount > 0 ? "default" : "outline"} className={catData.color}>
                          {selectedCount}/{categoryRoles.length}
                        </Badge>
                        <button
                          onClick={() => selectAllCategory(cat, selectedCount === 0)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {selectedCount === categoryRoles.length ? "Desmarcar" : "Marcar"} todas
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categoryRoles.map((role) => (
                        <div
                          key={role.value}
                          className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`jr-${role.value}`}
                            checked={profileJobRoles.includes(role.value)}
                            onCheckedChange={() => toggleJobRole(role.value)}
                          />
                          <Label htmlFor={`jr-${role.value}`} className="text-sm cursor-pointer">
                            {role.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {profileJobRoles.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-sm text-blue-900 mb-2">
                Funções Selecionadas:
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileJobRoles.map((jr) => {
                  const role = jobRoles.find(r => r.value === jr);
                  const category = jobRoleCategories[role?.category];
                  return (
                    <Badge key={jr} className={category?.color || "bg-gray-100 text-gray-700"}>
                      {role?.label || jr}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
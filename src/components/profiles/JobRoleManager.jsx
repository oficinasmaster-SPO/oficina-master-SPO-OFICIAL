import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { jobRoles, jobRoleCategories } from "@/components/lib/jobRoles";
import { Briefcase } from "lucide-react";

export default function JobRoleManager({ profile, onChange }) {
  const handleToggleJobRole = (roleValue) => {
    const currentJobRoles = profile.job_roles || [];
    const updated = currentJobRoles.includes(roleValue)
      ? currentJobRoles.filter(r => r !== roleValue)
      : [...currentJobRoles, roleValue];
    
    onChange({
      ...profile,
      job_roles: updated,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-600" />
          Funções Vinculadas (job_role)
        </CardTitle>
        <CardDescription>
          Selecione quais funções terão este perfil automaticamente quando um colaborador for cadastrado.
          Isso garante que cada função tenha as permissões corretas desde o início.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(jobRoleCategories).map(([cat, catData]) => {
            const categoryRoles = jobRoles.filter(jr => jr.category === cat);
            const selectedInCategory = categoryRoles.filter(jr => 
              (profile.job_roles || []).includes(jr.value)
            ).length;

            return (
              <div key={cat} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {catData.label}
                    {selectedInCategory > 0 && (
                      <Badge variant="outline" className={catData.color}>
                        {selectedInCategory} selecionadas
                      </Badge>
                    )}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryRoles.map((role) => {
                    const isSelected = (profile.job_roles || []).includes(role.value);
                    return (
                      <div
                        key={role.value}
                        className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                          isSelected
                            ? "bg-purple-50 border-purple-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          id={`job-role-${role.value}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggleJobRole(role.value)}
                        />
                        <Label
                          htmlFor={`job-role-${role.value}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {role.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {profile.job_roles && profile.job_roles.length > 0 && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-900 mb-2">
              Funções selecionadas ({profile.job_roles.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.job_roles.map((jr) => {
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
  );
}
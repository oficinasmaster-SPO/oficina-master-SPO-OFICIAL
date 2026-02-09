import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobRoles, jobRoleCategories } from "@/components/lib/jobRoles";
import { Briefcase, X, Save } from "lucide-react";
import { toast } from "sonner";

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
    
    toast.success(
      currentJobRoles.includes(roleValue) 
        ? "Função removida" 
        : "Função adicionada"
    );
  };
  
  const handleRemoveJobRole = (roleValue) => {
    const currentJobRoles = profile.job_roles || [];
    const updated = currentJobRoles.filter(r => r !== roleValue);
    
    onChange({
      ...profile,
      job_roles: updated,
    });
    
    toast.success("Função removida do perfil");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Funções Vinculadas (job_role)
            </CardTitle>
            <CardDescription className="mt-1">
              Selecione quais funções terão este perfil automaticamente quando um colaborador for cadastrado.
              Isso garante que cada função tenha as permissões corretas desde o início.
            </CardDescription>
          </div>
          <div className="text-sm text-gray-500 flex flex-col items-end gap-1">
            <span className="font-medium">{(profile.job_roles || []).length} funções</span>
            <span className="text-xs">vinculadas</span>
          </div>
        </div>
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-purple-900">
                Funções selecionadas ({profile.job_roles.length}):
              </p>
              <p className="text-xs text-purple-700">
                Clique no X para remover uma função
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.job_roles.map((jr) => {
                const role = jobRoles.find(r => r.value === jr);
                const category = jobRoleCategories[role?.category];
                return (
                  <Badge 
                    key={jr} 
                    className={`${category?.color || "bg-gray-100 text-gray-700"} flex items-center gap-1.5 pr-1 cursor-pointer hover:opacity-80 transition-opacity`}
                  >
                    <span>{role?.label || jr}</span>
                    <button
                      onClick={() => handleRemoveJobRole(jr)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                      title="Remover função"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
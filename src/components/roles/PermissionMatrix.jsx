import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, Unlock } from "lucide-react";

export default function PermissionMatrix({ 
  role, 
  modules, 
  permissions, 
  onToggle, 
  onSelectAll,
  type = "sidebar" 
}) {
  const getModuleIcon = (moduleId) => {
    return permissions[role.id]?.[moduleId] ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : null;
  };

  const allSelected = modules.every(m => permissions[role.id]?.[m.id]);
  const someSelected = modules.some(m => permissions[role.id]?.[m.id]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${allSelected ? 'bg-green-100' : someSelected ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                {allSelected ? <Unlock className="w-5 h-5 text-green-600" /> : <Lock className="w-5 h-5 text-gray-600" />}
              </div>
              {role.label}
            </CardTitle>
            <CardDescription className="mt-1">
              Configuração de {type === "sidebar" ? "Sidebar Principal" : "Portal do Colaborador"}
            </CardDescription>
          </div>
          <Button 
            variant={allSelected ? "outline" : "default"} 
            size="sm" 
            onClick={() => onSelectAll(role.id)}
            className={allSelected ? "" : "bg-blue-600 hover:bg-blue-700"}
          >
            {allSelected ? "Desmarcar Todos" : "Selecionar Todos"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((module) => (
            <div 
              key={module.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                permissions[role.id]?.[module.id] 
                  ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm" 
                  : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Checkbox 
                id={`${type}-${role.id}-${module.id}`}
                checked={permissions[role.id]?.[module.id] || false}
                onCheckedChange={() => onToggle(role.id, module.id)}
                className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label
                htmlFor={`${type}-${role.id}-${module.id}`}
                className="text-sm font-medium leading-none cursor-pointer flex-1 py-1"
              >
                {module.label}
              </label>
              {getModuleIcon(module.id)}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            {Object.values(permissions[role.id] || {}).filter(Boolean).length} de {modules.length} módulos habilitados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
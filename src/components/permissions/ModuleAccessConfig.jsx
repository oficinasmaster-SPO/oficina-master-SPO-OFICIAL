import React from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, Database, Wrench, BarChart4, Users as UsersIcon, 
  Brain, Package, FileCheck, Heart, GraduationCap, Lightbulb, 
  Briefcase, Shield
} from "lucide-react";

const modules = [
  { id: "dashboard", label: "Dashboard & Rankings", icon: LayoutDashboard, color: "text-blue-600" },
  { id: "cadastros", label: "Cadastros", icon: Database, color: "text-gray-600" },
  { id: "patio", label: "Pátio (QGP)", icon: Wrench, color: "text-orange-600" },
  { id: "resultados", label: "Resultados", icon: BarChart4, color: "text-green-600" },
  { id: "pessoas", label: "Pessoas & RH", icon: UsersIcon, color: "text-purple-600" },
  { id: "diagnosticos", label: "Diagnósticos & IA", icon: Brain, color: "text-indigo-600" },
  { id: "processos", label: "Processos", icon: Package, color: "text-cyan-600" },
  { id: "documentos", label: "Documentos", icon: FileCheck, color: "text-teal-600" },
  { id: "cultura", label: "Cultura", icon: Heart, color: "text-pink-600" },
  { id: "treinamentos", label: "Treinamentos", icon: GraduationCap, color: "text-yellow-600" },
  { id: "gestao", label: "Gestão Operação", icon: Lightbulb, color: "text-amber-600" },
  { id: "aceleracao", label: "Aceleração", icon: Briefcase, color: "text-emerald-600" },
  { id: "admin", label: "Administração", icon: Shield, color: "text-red-600" }
];

const accessLevels = [
  { value: "total", label: "Acesso Total", color: "bg-green-100 text-green-700" },
  { value: "visualizacao", label: "Só Visualização", color: "bg-blue-100 text-blue-700" },
  { value: "bloqueado", label: "Bloqueado", color: "bg-red-100 text-red-700" }
];

export default function ModuleAccessConfig({ permissions, onChange, jobRoles }) {
  const handleAccessChange = (roleId, moduleId, level) => {
    const newPermissions = { ...permissions };
    
    if (!newPermissions[roleId]) {
      newPermissions[roleId] = {};
    }
    if (!newPermissions[roleId].modules) {
      newPermissions[roleId].modules = {};
    }
    
    newPermissions[roleId].modules[moduleId] = level;
    
    onChange(newPermissions);
  };

  const getAccessLevel = (roleId, moduleId) => {
    return permissions[roleId]?.modules?.[moduleId] || "bloqueado";
  };

  const getAccessLevelColor = (level) => {
    return accessLevels.find(l => l.value === level)?.color || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      {(jobRoles || []).map((role) => (
        <Card key={role?.value || 'unknown'} className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {role?.label || 'Sem nome'}
              <Badge variant="outline" className="text-xs">
                {role?.value || 'N/A'}
              </Badge>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Defina o nível de acesso para cada módulo do sistema
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              const currentLevel = getAccessLevel(role.value, module.id);
              
              return (
                <div key={module.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${module.color}`} />
                      <span className="font-medium text-gray-900">{module.label}</span>
                    </div>
                    <Badge className={getAccessLevelColor(currentLevel)}>
                      {accessLevels.find(l => l.value === currentLevel)?.label}
                    </Badge>
                  </div>

                  <Select
                    value={currentLevel}
                    onValueChange={(value) => handleAccessChange(role.value, module.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accessLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <span className="flex items-center gap-2">
                            {level.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
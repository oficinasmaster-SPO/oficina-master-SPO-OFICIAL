import React from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Users, FileText, Target, Briefcase, ClipboardList, 
  BarChart3, Building2, BookOpen, GraduationCap, Heart,
  Package, Calendar, DollarSign, Brain, Trophy, MessageSquare
} from "lucide-react";

const resources = [
  { id: "employees", label: "Colaboradores", icon: Users, color: "text-blue-600" },
  { id: "tasks", label: "Tarefas", icon: ClipboardList, color: "text-orange-600" },
  { id: "goals", label: "Metas", icon: Target, color: "text-green-600" },
  { id: "diagnostics", label: "Diagnósticos", icon: Brain, color: "text-purple-600" },
  { id: "documents", label: "Documentos", icon: FileText, color: "text-gray-600" },
  { id: "processes", label: "Processos", icon: Package, color: "text-cyan-600" },
  { id: "training", label: "Treinamentos", icon: GraduationCap, color: "text-indigo-600" },
  { id: "culture", label: "Cultura", icon: Heart, color: "text-pink-600" },
  { id: "reports", label: "Relatórios", icon: BarChart3, color: "text-yellow-600" },
  { id: "workshop", label: "Gestão Oficina", icon: Building2, color: "text-teal-600" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, color: "text-emerald-600" },
  { id: "gamification", label: "Gamificação", icon: Trophy, color: "text-amber-600" },
  { id: "feedback", label: "Feedbacks", icon: MessageSquare, color: "text-blue-500" }
];

const actions = [
  { id: "create", label: "Criar" },
  { id: "read", label: "Ler" },
  { id: "update", label: "Editar" },
  { id: "delete", label: "Deletar" }
];

export default function PermissionMatrix({ permissions, onChange, jobRoles }) {
  const handleToggle = (roleId, resourceId, actionId) => {
    const newPermissions = { ...permissions };
    
    if (!newPermissions[roleId]) {
      newPermissions[roleId] = {};
    }
    if (!newPermissions[roleId][resourceId]) {
      newPermissions[roleId][resourceId] = {};
    }
    
    newPermissions[roleId][resourceId][actionId] = !newPermissions[roleId][resourceId]?.[actionId];
    
    onChange(newPermissions);
  };

  const isChecked = (roleId, resourceId, actionId) => {
    return permissions[roleId]?.[resourceId]?.[actionId] || false;
  };

  const getResourcePermissionCount = (roleId, resourceId) => {
    const resourcePerms = permissions[roleId]?.[resourceId] || {};
    return Object.values(resourcePerms).filter(Boolean).length;
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
              Configure as permissões CRUD para cada recurso
            </p>
          </div>

          <div className="grid gap-4">
            {resources.map((resource) => {
              const Icon = resource.icon;
              const permCount = getResourcePermissionCount(role.value, resource.id);
              
              return (
                <div key={resource.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${resource.color}`} />
                      <span className="font-medium text-gray-900">{resource.label}</span>
                      {permCount > 0 && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          {permCount}/{actions.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {actions.map((action) => (
                      <label
                        key={action.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                      >
                        <Checkbox
                          checked={isChecked(role.value, resource.id, action.id)}
                          onCheckedChange={() => handleToggle(role.value, resource.id, action.id)}
                        />
                        <span className="text-sm text-gray-700">{action.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
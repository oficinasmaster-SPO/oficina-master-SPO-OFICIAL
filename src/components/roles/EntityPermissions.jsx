import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Database, Users, FileText, Calendar, Brain, DollarSign } from "lucide-react";

// Entidades do sistema com suas operações CRUD
const systemEntities = [
  {
    id: "employees",
    name: "Colaboradores",
    icon: Users,
    description: "Gestão de colaboradores e equipe",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "clients",
    name: "Clientes",
    icon: Users,
    description: "Gestão de clientes",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "workshops",
    name: "Oficinas",
    icon: Database,
    description: "Dados das oficinas",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "diagnostics",
    name: "Diagnósticos",
    icon: Brain,
    description: "Diagnósticos e avaliações",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "processes",
    name: "Processos",
    icon: FileText,
    description: "Processos e documentos",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "goals",
    name: "Metas",
    icon: Calendar,
    description: "Metas e objetivos",
    operations: ["create", "read", "update", "delete"]
  },
  {
    id: "financial",
    name: "Financeiro",
    icon: DollarSign,
    description: "Dados financeiros e DRE",
    operations: ["create", "read", "update", "delete"]
  },
];

const operationLabels = {
  create: "Criar",
  read: "Visualizar",
  update: "Editar",
  delete: "Excluir"
};

const operationColors = {
  create: "bg-green-100 text-green-700",
  read: "bg-blue-100 text-blue-700",
  update: "bg-yellow-100 text-yellow-700",
  delete: "bg-red-100 text-red-700"
};

export default function EntityPermissions({ role, onChange }) {
  const entityPermissions = role?.entity_permissions || {};

  const handleTogglePermission = (entityId, operation) => {
    const currentPerms = entityPermissions[entityId] || [];
    const hasPermission = currentPerms.includes(operation);

    const newPerms = hasPermission
      ? currentPerms.filter(op => op !== operation)
      : [...currentPerms, operation];

    const updated = {
      ...entityPermissions,
      [entityId]: newPerms.length > 0 ? newPerms : undefined
    };

    // Remove chaves com arrays vazios
    Object.keys(updated).forEach(key => {
      if (!updated[key] || (Array.isArray(updated[key]) && updated[key].length === 0)) {
        delete updated[key];
      }
    });

    onChange({
      ...role,
      entity_permissions: updated
    });
  };

  const hasPermission = (entityId, operation) => {
    return (entityPermissions[entityId] || []).includes(operation);
  };

  const getEntityPermissionsCount = (entityId) => {
    return (entityPermissions[entityId] || []).length;
  };

  const getTotalPermissions = () => {
    return Object.values(entityPermissions).reduce((acc, perms) => acc + perms.length, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permissões Granulares por Entidade</CardTitle>
            <CardDescription className="mt-2">
              Defina permissões específicas de CRUD (Create, Read, Update, Delete) para cada entidade do sistema
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {getTotalPermissions()} permissões ativas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {systemEntities.map((entity) => {
            const Icon = entity.icon;
            const permCount = getEntityPermissionsCount(entity.id);

            return (
              <div key={entity.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{entity.name}</h3>
                        <p className="text-sm text-gray-600">{entity.description}</p>
                      </div>
                      {permCount > 0 && (
                        <Badge className="bg-blue-600">
                          {permCount} de {entity.operations.length}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4">
                      {entity.operations.map((operation) => (
                        <label
                          key={operation}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={hasPermission(entity.id, operation)}
                            onCheckedChange={() => handleTogglePermission(entity.id, operation)}
                          />
                          <Badge 
                            variant="outline" 
                            className={hasPermission(entity.id, operation) ? operationColors[operation] : ""}
                          >
                            {operationLabels[operation]}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>💡 Dica:</strong> Permissões granulares sobrescrevem as permissões gerais. 
            Por exemplo, se um usuário tem acesso ao módulo "Pessoas" mas não tem permissão de "delete" 
            em "Colaboradores", ele não poderá excluir colaboradores mesmo tendo acesso ao módulo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
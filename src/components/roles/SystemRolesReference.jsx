import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { systemRoles } from "@/components/lib/systemRoles";

export default function SystemRolesReference() {
  const [expandedModule, setExpandedModule] = useState(null);

  const totalSystemRoles = systemRoles.reduce((sum, m) => sum + m.roles.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Roles do Sistema</span>
          <Badge variant="outline">{totalSystemRoles} permissões disponíveis</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Roles nativas que podem ser combinadas em perfis customizados
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {systemRoles.map((module) => (
            <div key={module.id} className="border rounded-lg">
              <button
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <module.icon className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">{module.name}</span>
                  <Badge variant="outline">{module.roles.length} roles</Badge>
                </div>
                <span className="text-gray-400">{expandedModule === module.id ? "▼" : "▶"}</span>
              </button>
              {expandedModule === module.id && (
                <div className="border-t p-4 bg-gray-50 space-y-2">
                  {module.roles.map((role) => (
                    <div key={role.id} className="bg-white p-3 rounded border">
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{role.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
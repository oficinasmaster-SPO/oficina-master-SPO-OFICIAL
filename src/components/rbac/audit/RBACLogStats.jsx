import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Users, FileEdit, AlertCircle } from "lucide-react";

export default function RBACLogStats({ logs }) {
  const stats = {
    total: logs.length,
    profiles: logs.filter(l => l?.target_type === 'profile').length,
    roles: logs.filter(l => l?.target_type === 'role').length,
    granular: logs.filter(l => l?.target_type === 'granular_config').length,
    usersImpacted: logs.reduce((sum, l) => sum + (l?.affected_users_count || 0), 0)
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Total de Ações</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <FileEdit className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-sm text-gray-600">Perfis Alterados</p>
            <p className="text-2xl font-bold">{stats.profiles}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-orange-600" />
          <div>
            <p className="text-sm text-gray-600">Roles Alteradas</p>
            <p className="text-2xl font-bold">{stats.roles}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">Usuários Impactados</p>
            <p className="text-2xl font-bold">{stats.usersImpacted}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
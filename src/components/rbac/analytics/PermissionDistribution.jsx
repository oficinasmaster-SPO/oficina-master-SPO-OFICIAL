import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Shield, TrendingUp } from "lucide-react";

export default function PermissionDistribution({ profiles, customRoles }) {
  // Calcular distribuição de permissões por perfil
  const profileDistribution = (profiles || []).map(profile => ({
    name: profile.name,
    permissions: (profile.roles || []).length + (profile.custom_role_ids || []).length,
    users: profile.users_count || 0,
    type: profile.type
  })).sort((a, b) => b.permissions - a.permissions).slice(0, 10);

  // Calcular distribuição de system roles
  const roleUsage = {};
  (profiles || []).forEach(profile => {
    (profile.roles || []).forEach(role => {
      roleUsage[role] = (roleUsage[role] || 0) + (profile.users_count || 0);
    });
  });

  const topRoles = Object.entries(roleUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([role, count]) => ({
      name: role.split('.').pop(),
      users: count
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-blue-600" />
            Top 10 Perfis com Mais Permissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profileDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" style={{ fontSize: '12px' }} />
              <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="permissions" fill="#3b82f6" name="Permissões" />
              <Bar dataKey="users" fill="#10b981" name="Usuários" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Top 10 Permissões Mais Usadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRoles} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" style={{ fontSize: '12px' }} />
              <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
              <Tooltip />
              <Bar dataKey="users" fill="#8b5cf6" name="Usuários com Acesso" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
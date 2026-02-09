import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Users, Shield, Award } from "lucide-react";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];

export default function ProfileUsageStats({ profiles, employees }) {
  // Perfis mais usados
  const profileUsage = (profiles || [])
    .filter(p => p.users_count > 0)
    .sort((a, b) => b.users_count - a.users_count)
    .slice(0, 8);

  const profileData = profileUsage.map(p => ({
    name: p.name,
    value: p.users_count || 0,
    type: p.type
  }));

  // Estatísticas gerais
  const totalProfiles = profiles?.length || 0;
  const activeProfiles = profiles?.filter(p => p.status === 'ativo').length || 0;
  const totalUsers = employees?.length || 0;
  const usersWithProfile = employees?.filter(e => e.profile_id).length || 0;

  // Distribuição por tipo
  const typeDistribution = [
    { name: 'Interno', value: profiles?.filter(p => p.type === 'interno').length || 0 },
    { name: 'Externo', value: profiles?.filter(p => p.type === 'externo').length || 0 },
    { name: 'Sistema', value: profiles?.filter(p => p.type === 'sistema').length || 0 }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Total de Perfis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalProfiles}</p>
            <p className="text-xs text-gray-500 mt-1">{activeProfiles} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários com Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{usersWithProfile}</p>
            <p className="text-xs text-gray-500 mt-1">de {totalUsers} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Taxa de Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {totalUsers > 0 ? Math.round((usersWithProfile / totalUsers) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">usuários configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Média Usuários/Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {activeProfiles > 0 ? Math.round(usersWithProfile / activeProfiles) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">usuários por perfil</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-blue-600" />
              Perfis Mais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={profileData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {profileData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Nenhum perfil em uso</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-purple-600" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index + 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>Sem dados de distribuição</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de Perfis por Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profileUsage.length > 0 ? (
              profileUsage.map((profile, idx) => (
                <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{profile.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {profile.type}
                        </Badge>
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          {(profile.roles || []).length} permissões
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{profile.users_count || 0}</p>
                    <p className="text-xs text-gray-500">usuários</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum perfil em uso</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
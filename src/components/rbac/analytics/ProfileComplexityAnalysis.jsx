import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

export default function ProfileComplexityAnalysis({ profiles }) {
  const complexityData = useMemo(() => {
    return (profiles || []).map(profile => {
      const totalPermissions = (profile.roles || []).length;
      const customRolesCount = (profile.custom_role_ids || []).length;
      const usersCount = profile.users_count || 0;
      
      // Calcular score de complexidade (0-100)
      const complexityScore = Math.min(100, (totalPermissions * 2) + (customRolesCount * 5));
      
      let complexity = 'Simples';
      let color = 'green';
      
      if (complexityScore > 60) {
        complexity = 'Alta';
        color = 'red';
      } else if (complexityScore > 30) {
        complexity = 'Média';
        color = 'orange';
      }

      return {
        name: profile.name,
        permissions: totalPermissions,
        customRoles: customRolesCount,
        users: usersCount,
        complexityScore,
        complexity,
        color,
        type: profile.type
      };
    }).sort((a, b) => b.complexityScore - a.complexityScore);
  }, [profiles]);

  const averageComplexity = complexityData.length > 0
    ? (complexityData.reduce((sum, p) => sum + p.complexityScore, 0) / complexityData.length).toFixed(1)
    : 0;

  const highComplexityProfiles = complexityData.filter(p => p.complexityScore > 60).length;
  const simpleProfiles = complexityData.filter(p => p.complexityScore <= 30).length;

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{averageComplexity}</div>
              <p className="text-sm text-gray-600 mt-1">Complexidade Média</p>
              <p className="text-xs text-gray-500 mt-1">escala 0-100</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{highComplexityProfiles}</div>
              <p className="text-sm text-gray-600 mt-1">Alta Complexidade</p>
              <p className="text-xs text-gray-500 mt-1">&gt; 60 pontos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{simpleProfiles}</div>
              <p className="text-sm text-gray-600 mt-1">Perfis Simples</p>
              <p className="text-xs text-gray-500 mt-1">≤ 30 pontos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de complexidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-5 h-5 text-purple-600" />
            Análise de Complexidade por Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={complexityData.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" style={{ fontSize: '12px' }} />
              <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '11px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="permissions" fill="#3b82f6" name="Permissões" />
              <Bar dataKey="customRoles" fill="#8b5cf6" name="Roles Customizadas" />
              <Bar dataKey="users" fill="#10b981" name="Usuários" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista detalhada com recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfis por Nível de Complexidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complexityData.map((profile) => {
              const Icon = profile.complexityScore > 60 
                ? AlertCircle 
                : profile.complexityScore > 30 
                  ? AlertTriangle 
                  : CheckCircle;
              
              const iconColor = profile.complexityScore > 60 
                ? 'text-red-600' 
                : profile.complexityScore > 30 
                  ? 'text-orange-600' 
                  : 'text-green-600';

              const bgColor = profile.complexityScore > 60 
                ? 'bg-red-50 border-red-200' 
                : profile.complexityScore > 30 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-green-50 border-green-200';

              return (
                <div 
                  key={profile.name} 
                  className={`border rounded-lg p-4 ${bgColor}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{profile.name}</h4>
                          <Badge variant="outline" className="text-xs">{profile.type}</Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-600">
                          <span>{profile.permissions} permissões</span>
                          <span>•</span>
                          <span>{profile.customRoles} roles customizadas</span>
                          <span>•</span>
                          <span>{profile.users} usuários</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-gray-900">{profile.complexityScore}</div>
                      <Badge 
                        className={
                          profile.complexityScore > 60 
                            ? 'bg-red-100 text-red-700' 
                            : profile.complexityScore > 30 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                        }
                      >
                        {profile.complexity}
                      </Badge>
                    </div>
                  </div>
                  
                  {profile.complexityScore > 60 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs text-red-700">
                        ⚠️ <strong>Recomendação:</strong> Considere dividir este perfil em múltiplos perfis mais específicos para facilitar a gestão.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
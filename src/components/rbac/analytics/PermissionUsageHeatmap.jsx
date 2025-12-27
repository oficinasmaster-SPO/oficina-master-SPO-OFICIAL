import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";

export default function PermissionUsageHeatmap({ profiles }) {
  const heatmapData = useMemo(() => {
    const modules = systemRoles.map(module => {
      const modulePermissions = module.roles.map(role => {
        // Contar quantos usuários têm essa permissão
        let totalUsers = 0;
        (profiles || []).forEach(profile => {
          if ((profile.roles || []).includes(role.id)) {
            totalUsers += profile.users_count || 0;
          }
        });

        return {
          id: role.id,
          name: role.name,
          users: totalUsers,
          intensity: totalUsers > 20 ? 'high' : totalUsers > 10 ? 'medium' : totalUsers > 0 ? 'low' : 'none'
        };
      });

      const moduleTotal = modulePermissions.reduce((sum, p) => sum + p.users, 0);

      return {
        moduleName: module.name,
        permissions: modulePermissions,
        totalUsers: moduleTotal,
        avgUsers: modulePermissions.length > 0 ? (moduleTotal / modulePermissions.length).toFixed(1) : 0
      };
    }).sort((a, b) => b.totalUsers - a.totalUsers);

    return modules;
  }, [profiles]);

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'high': return 'bg-green-600 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-400 text-white';
      default: return 'bg-gray-200 text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5 text-blue-600" />
          Mapa de Calor de Uso de Permissões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-gray-700">Intensidade:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <span className="text-gray-600">Não usado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded" />
              <span className="text-gray-600">1-10 usuários</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span className="text-gray-600">11-20 usuários</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded" />
              <span className="text-gray-600">&gt;20 usuários</span>
            </div>
          </div>

          {/* Módulos com heatmap */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {heatmapData.map(module => (
              <div key={module.moduleName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-900">{module.moduleName}</h4>
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">{module.totalUsers}</span> usuários total
                    <span className="mx-2">•</span>
                    <span>média {module.avgUsers}/permissão</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {module.permissions.map(permission => (
                    <div
                      key={permission.id}
                      className={`px-3 py-2 rounded-lg transition-all cursor-help ${getIntensityColor(permission.intensity)}`}
                      title={`${permission.name} - ${permission.users} usuários`}
                    >
                      <div className="text-xs font-medium">
                        {permission.id.split('.').pop()}
                      </div>
                      <div className="text-xs opacity-90 mt-0.5">
                        {permission.users}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
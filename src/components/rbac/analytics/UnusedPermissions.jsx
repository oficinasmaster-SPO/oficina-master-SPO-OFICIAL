import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import { systemRoles } from "@/components/lib/systemRoles";

export default function UnusedPermissions({ profiles }) {
  const { unusedPermissions, totalPermissions, usageStats } = useMemo(() => {
    // Obter todas as permissões do sistema
    const allSystemPermissions = systemRoles.flatMap(m => m.roles.map(r => r.id));
    
    // Obter todas as permissões em uso
    const usedPermissions = new Set();
    (profiles || []).forEach(profile => {
      (profile.roles || []).forEach(role => {
        usedPermissions.add(role);
      });
    });

    // Calcular frequência de uso
    const permissionUsage = {};
    (profiles || []).forEach(profile => {
      (profile.roles || []).forEach(role => {
        permissionUsage[role] = (permissionUsage[role] || 0) + (profile.users_count || 0);
      });
    });

    const unused = allSystemPermissions.filter(p => !usedPermissions.has(p));
    
    // Permissões raramente usadas (menos de 3 usuários)
    const rarelyUsed = Object.entries(permissionUsage)
      .filter(([_, count]) => count < 3)
      .map(([permission, count]) => ({ permission, count }))
      .sort((a, b) => a.count - b.count);

    return {
      unusedPermissions: unused,
      totalPermissions: allSystemPermissions.length,
      usageStats: {
        unused: unused.length,
        rarelyUsed: rarelyUsed.length,
        active: allSystemPermissions.length - unused.length
      },
      rarelyUsedList: rarelyUsed
    };
  }, [profiles]);

  const usagePercentage = ((usageStats.active / totalPermissions) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Estatísticas de uso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{usageStats.active}</div>
              <p className="text-sm text-gray-600 mt-1">Permissões Ativas</p>
              <p className="text-xs text-gray-500 mt-1">{usagePercentage}% do total</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{usageStats.rarelyUsed}</div>
              <p className="text-sm text-gray-600 mt-1">Pouco Utilizadas</p>
              <p className="text-xs text-gray-500 mt-1">&lt; 3 usuários</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{usageStats.unused}</div>
              <p className="text-sm text-gray-600 mt-1">Não Utilizadas</p>
              <p className="text-xs text-gray-500 mt-1">0 usuários</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissões não utilizadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Permissões Não Utilizadas ({unusedPermissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unusedPermissions.length > 0 ? (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Otimização Sugerida</p>
                    <p className="mt-1">
                      Estas permissões não estão atribuídas a nenhum perfil. 
                      Considere se são realmente necessárias para o sistema.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {unusedPermissions.map((permission) => {
                  const module = systemRoles.find(m => m.roles.some(r => r.id === permission));
                  const role = module?.roles.find(r => r.id === permission);
                  
                  return (
                    <div 
                      key={permission} 
                      className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <code className="text-xs font-mono text-red-600 block truncate" title={permission}>
                        {permission}
                      </code>
                      {role && (
                        <p className="text-xs text-gray-600 mt-1">{role.name}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-green-600">
              <p className="font-medium">✓ Todas as permissões estão em uso!</p>
              <p className="text-sm text-gray-600 mt-1">Sistema otimizado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissões raramente usadas */}
      {usageStats.rarelyUsedList?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Permissões Raramente Usadas ({usageStats.rarelyUsedList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold">Atenção</p>
                  <p className="mt-1">
                    Estas permissões são usadas por menos de 3 usuários. 
                    Avalie se precisam estar em perfis mais amplos.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {usageStats.rarelyUsedList.slice(0, 15).map(({ permission, count }) => {
                const module = systemRoles.find(m => m.roles.some(r => r.id === permission));
                const role = module?.roles.find(r => r.id === permission);
                
                return (
                  <div 
                    key={permission} 
                    className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <code className="text-xs font-mono text-orange-600">{permission}</code>
                      {role && (
                        <p className="text-xs text-gray-600 mt-1">{role.name}</p>
                      )}
                    </div>
                    <Badge className="bg-orange-100 text-orange-700">
                      {count} usuário{count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
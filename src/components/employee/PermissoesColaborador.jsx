import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Layout, AlertTriangle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import EmployeeProfileViewer from "./EmployeeProfileViewer";

export default function PermissoesColaborador({ employee }) {
  const [showDetailedView, setShowDetailedView] = React.useState(false);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', employee?.profile_id],
    queryFn: () => base44.entities.UserProfile.get(employee.profile_id),
    enabled: !!employee?.id && !!employee?.profile_id
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list(),
    enabled: !!employee?.id && !!profile
  });

  if (!employee?.id) return null;

  const profileCustomRoles = customRoles.filter(r => 
    profile?.custom_role_ids?.includes(r.id)
  );

  const getModulePermissions = () => {
    if (!profile?.module_permissions) return [];
    return Object.entries(profile.module_permissions).map(([module, level]) => ({
      module,
      level
    }));
  };

  const getSidebarPermissions = () => {
    if (!profile?.sidebar_permissions) return [];
    const permissions = Object.entries(profile.sidebar_permissions)
      .filter(([_, perms]) => perms.view || perms.edit || perms.delete || perms.create);
    return permissions.slice(0, 8); // Mostrar apenas primeiras 8
  };

  const totalSidebarPermissions = profile?.sidebar_permissions 
    ? Object.keys(profile.sidebar_permissions).length 
    : 0;

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permissões do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-3" />
            <h3 className="font-semibold text-yellow-900 mb-2">
              Perfil de Acesso Não Atribuído
            </h3>
            <p className="text-sm text-yellow-700">
              Este colaborador ainda não possui um perfil de acesso configurado. 
              Atribua um perfil para definir suas permissões no sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Resumo do Perfil */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissões do Sistema
              </CardTitle>
              <Button 
                onClick={() => setShowDetailedView(true)} 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver Detalhes Completos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Perfil Atribuído:</p>
              <div className="flex items-center gap-3">
                <Badge className="text-base py-1.5 px-4 bg-blue-600">
                  {profile.name}
                </Badge>
                <Badge variant="outline">
                  {profile.type === 'interno' ? 'Interno' : 
                   profile.type === 'externo' ? 'Externo' : 'Sistema'}
                </Badge>
              </div>
              {profile.description && (
                <p className="text-sm text-gray-600 mt-2">{profile.description}</p>
              )}
            </div>

            {/* Roles Customizadas */}
            {profileCustomRoles.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Roles Customizadas:</p>
                <div className="flex flex-wrap gap-2">
                  {profileCustomRoles.map(role => (
                    <Badge key={role.id} variant="secondary" className="py-1.5">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Permissões do Sistema */}
            {profile.roles && profile.roles.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Permissões do Sistema ({profile.roles.length}):
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {profile.roles.slice(0, 9).map(role => (
                    <Badge key={role} variant="outline" className="justify-center py-1.5">
                      {role}
                    </Badge>
                  ))}
                  {profile.roles.length > 9 && (
                    <Badge variant="outline" className="justify-center py-1.5 bg-gray-100">
                      +{profile.roles.length - 9} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissões de Módulos */}
        {getModulePermissions().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Permissões de Módulos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getModulePermissions().map(({ module, level }) => (
                  <div key={module} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium capitalize">{module}</span>
                    <Badge className={
                      level === 'total' ? 'bg-green-600' :
                      level === 'visualizacao' ? 'bg-blue-600' :
                      'bg-gray-600'
                    }>
                      {level === 'total' ? 'Acesso Total' : 
                       level === 'visualizacao' ? 'Visualização' : 'Bloqueado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Permissões de Navegação (Preview) */}
        {getSidebarPermissions().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Permissões de Navegação
              </CardTitle>
              <p className="text-sm text-gray-500">
                Mostrando 8 de {totalSidebarPermissions} itens
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSidebarPermissions().map(([item, perms]) => (
                  <div key={item} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium text-sm">{item}</span>
                    <div className="flex gap-2">
                      {perms.view && <Badge variant="outline" className="bg-green-50 text-xs">Ver</Badge>}
                      {perms.edit && <Badge variant="outline" className="bg-blue-50 text-xs">Editar</Badge>}
                      {perms.create && <Badge variant="outline" className="bg-purple-50 text-xs">Criar</Badge>}
                    </div>
                  </div>
                ))}
              </div>
              {totalSidebarPermissions > 8 && (
                <div className="mt-4 text-center">
                  <Button 
                    onClick={() => setShowDetailedView(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    Ver Todas as {totalSidebarPermissions} Permissões
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <EmployeeProfileViewer
        employee={employee}
        open={showDetailedView}
        onClose={() => setShowDetailedView(false)}
      />
    </>
  );
}
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Users, Briefcase, Layout, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { jobRoles } from "@/components/lib/jobRoles";
import { systemRoles } from "@/components/lib/systemRoles";

export default function ProfileDetailsModal({ profile, open, onClose }) {
  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: () => base44.entities.CustomRole.list(),
    enabled: !!profile?.id && open
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!profile?.id && open
  });

  if (!profile || !open) return null;

  const usersCount = employees.filter(e => e?.profile_id === profile?.id).length;
  const profileCustomRoles = customRoles.filter(r => 
    profile?.custom_role_ids?.includes(r?.id)
  );

  const getJobRoleLabel = (value) => {
    return jobRoles.find(jr => jr.value === value)?.label || value;
  };

  const getAllSystemRoles = () => {
    if (!profile.roles || profile.roles.length === 0) return [];
    return profile.roles;
  };

  const getModulePermissions = () => {
    if (!profile.module_permissions) return [];
    return Object.entries(profile.module_permissions).map(([module, level]) => ({
      module,
      level
    }));
  };

  const getSidebarPermissions = () => {
    if (!profile.sidebar_permissions) return [];
    return Object.entries(profile.sidebar_permissions)
      .filter(([_, perms]) => perms.view || perms.edit || perms.delete || perms.create)
      .map(([item, perms]) => ({ item, ...perms }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Especificação Técnica do Perfil de Acesso
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* 1. IDENTIFICAÇÃO DO PERFIL */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <FileText className="w-5 h-5" />
                  1. IDENTIFICAÇÃO DO PERFIL
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-gray-700">Nome do Perfil:</p>
                      <p className="text-gray-900">{profile.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">Tipo:</p>
                      <Badge variant="outline" className="mt-1">
                        {profile.type === 'interno' ? 'Interno' : 
                         profile.type === 'externo' ? 'Externo' : 'Sistema'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Status:</p>
                    <Badge className={profile.status === 'ativo' ? 'bg-green-600' : 'bg-gray-600'}>
                      {profile.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Usuários Vinculados:</p>
                    <p className="text-gray-900">{usersCount} usuário(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. DESCRIÇÃO E FINALIDADE */}
            {profile.description && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <FileText className="w-5 h-5" />
                    2. DESCRIÇÃO E FINALIDADE
                  </h3>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                    {profile.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 3. FUNÇÕES E CARGOS ASSOCIADOS */}
            {profile.job_roles && profile.job_roles.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Briefcase className="w-5 h-5" />
                    3. FUNÇÕES E CARGOS ASSOCIADOS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {profile.job_roles.map(jr => (
                      <Badge key={jr} variant="secondary" className="justify-center py-2">
                        {getJobRoleLabel(jr)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. ROLES CUSTOMIZADAS */}
            {profileCustomRoles.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Shield className="w-5 h-5" />
                    4. ROLES CUSTOMIZADAS
                  </h3>
                  <div className="space-y-3">
                    {profileCustomRoles.map(role => (
                      <div key={role.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-gray-900">{role.name}</p>
                        <p className="text-sm text-gray-600">{role.description}</p>
                        {role.permissions && Object.keys(role.permissions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(role.permissions).map(([key, perms]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 5. PERMISSÕES DO SISTEMA */}
            {getAllSystemRoles().length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Shield className="w-5 h-5" />
                    5. PERMISSÕES DO SISTEMA
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {getAllSystemRoles().map(role => (
                      <Badge key={role} variant="outline" className="justify-center py-2">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 6. PERMISSÕES DE MÓDULOS */}
            {getModulePermissions().length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Layout className="w-5 h-5" />
                    6. PERMISSÕES DE MÓDULOS
                  </h3>
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

            {/* 7. PERMISSÕES DA SIDEBAR */}
            {getSidebarPermissions().length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <Layout className="w-5 h-5" />
                    7. PERMISSÕES DE NAVEGAÇÃO
                  </h3>
                  <div className="space-y-2">
                    {getSidebarPermissions().map((perm) => (
                      <div key={perm.item} className="flex items-center justify-between p-3 border rounded">
                        <span className="font-medium">{perm.item}</span>
                        <div className="flex gap-2">
                          {perm.view && <Badge variant="outline" className="bg-green-50">Ver</Badge>}
                          {perm.edit && <Badge variant="outline" className="bg-blue-50">Editar</Badge>}
                          {perm.create && <Badge variant="outline" className="bg-purple-50">Criar</Badge>}
                          {perm.delete && <Badge variant="outline" className="bg-red-50">Excluir</Badge>}
                          {perm.export && <Badge variant="outline" className="bg-yellow-50">Exportar</Badge>}
                          {perm.approve && <Badge variant="outline" className="bg-indigo-50">Aprovar</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RODAPÉ FORMAL */}
            <div className="text-xs text-gray-500 text-center pt-6 border-t">
              <p>Documento gerado automaticamente pelo Sistema de Gestão RBAC</p>
              <p className="mt-1">Oficinas Master GTR - {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
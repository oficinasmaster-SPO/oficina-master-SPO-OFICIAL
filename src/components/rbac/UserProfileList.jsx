import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { jobRoles } from "@/components/lib/jobRoles";
import { useQuery } from "@tanstack/react-query";

export default function UserProfileList({ profiles, onEdit, onClone, getUserCount }) {
  const queryClient = useQueryClient();

  const { data: customRolesMap } = useQuery({
    queryKey: ['customRolesMap'],
    queryFn: async () => {
      const roles = await base44.entities.CustomRole.list();
      return roles.reduce((acc, role) => {
        acc[role.id] = role.name;
        return acc;
      }, {});
    },
    staleTime: Infinity,
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.UserProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfiles']);
      toast.success("Perfil de usuário excluído com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao excluir perfil de usuário: " + err.message);
    },
  });

  const getJobRoleLabel = (value) => {
    return jobRoles.find(jr => jr.value === value)?.label || value;
  };

  if (!profiles || profiles.length === 0) {
    return <p className="text-center text-gray-500">Nenhum perfil de usuário encontrado.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map(profile => {
        const userCount = getUserCount(profile.id);

        return (
          <Card key={profile.id} className="relative hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="truncate">{profile.name}</span>
                <Badge variant={profile.status === 'ativo' ? 'default' : 'secondary'} className="ml-2">
                  {profile.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardTitle>
              <CardDescription className="line-clamp-2">{profile.description || "Sem descrição."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Tipo:</span> {profile.type}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Permissões por:</span> {
                  profile.permission_type === 'job_role' ? 'Cargo' :
                  profile.permission_type === 'custom_role' ? 'Roles Customizadas' :
                  profile.permission_type === 'role' ? 'Permissões Diretas' : 'N/A'
                }
              </div>
              {profile.permission_type === 'job_role' && profile.job_roles && profile.job_roles.length > 0 && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Cargos:</span> 
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.job_roles.slice(0, 2).map(jr => (
                      <Badge key={jr} variant="outline" className="text-xs">{getJobRoleLabel(jr)}</Badge>
                    ))}
                    {profile.job_roles.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{profile.job_roles.length - 2}</Badge>
                    )}
                  </div>
                </div>
              )}
              {profile.permission_type === 'custom_role' && profile.custom_role_ids && profile.custom_role_ids.length > 0 && customRolesMap && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Roles:</span> 
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.custom_role_ids.slice(0, 2).map(id => (
                      <Badge key={id} variant="outline" className="text-xs">{customRolesMap[id] || id}</Badge>
                    ))}
                    {profile.custom_role_ids.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{profile.custom_role_ids.length - 2}</Badge>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                <Users className="w-4 h-4" />
                <span className="font-medium">{userCount} usuário(s)</span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(profile)} className="flex-1">
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onClone(profile)} className="flex-1">
                  <Copy className="h-4 w-4 mr-1" /> Clonar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso irá deletar permanentemente o perfil de usuário <span className="font-bold">{profile.name}</span>.
                        {userCount > 0 && (
                          <p className="text-red-600 mt-2 font-semibold">
                            ⚠️ Este perfil está sendo usado por {userCount} usuário(s). Remova as vinculações antes de excluir.
                          </p>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteProfileMutation.mutate(profile.id)} 
                        className="bg-red-600 hover:bg-red-700"
                        disabled={userCount > 0}
                      >
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
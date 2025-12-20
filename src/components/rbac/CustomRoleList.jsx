import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CustomRoleList({ roles, onEdit, onClone, getDependencies }) {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['customRoles']);
      toast.success("Role customizada excluída com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao excluir role customizada: " + err.message);
    },
  });

  if (!roles || roles.length === 0) {
    return <p className="text-center text-gray-500">Nenhuma role customizada encontrada.</p>;
  }

  const getDependencyCount = (roleId) => {
    return getDependencies(roleId).length;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roles.map(role => {
        const dependencyCount = getDependencyCount(role.id);
        const dependencies = getDependencies(role.id);

        return (
          <Card key={role.id} className="relative hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="truncate">{role.name}</span>
                <Badge variant={role.status === 'ativo' ? 'default' : 'secondary'} className="ml-2">
                  {role.status === 'ativo' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CardTitle>
              <CardDescription className="line-clamp-2">{role.description || "Sem descrição."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Permissões de Sistema:</span> {role.system_roles?.length || 0}
              </div>
              <div className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Permissões de Entidade:</span> {Object.keys(role.entity_permissions || {}).length}
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mb-2"
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Dependências ({dependencyCount})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Perfis que usam esta Role</DialogTitle>
                    <DialogDescription>
                      Role: <strong>{role.name}</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    {dependencies.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhum perfil está usando esta role.</p>
                    ) : (
                      dependencies.map(profile => (
                        <Card key={profile.id}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{profile.name}</p>
                                <p className="text-xs text-gray-500">{profile.type}</p>
                              </div>
                              <Badge>{profile.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(role)} className="flex-1">
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onClone(role)} className="flex-1">
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
                        Esta ação não pode ser desfeita. Isso irá deletar permanentemente a role customizada <span className="font-bold">{role.name}</span>.
                        {dependencyCount > 0 && (
                          <p className="text-red-600 mt-2 font-semibold">
                            ⚠️ Esta role está sendo usada por {dependencyCount} perfil(s). Remova as dependências antes de excluir.
                          </p>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteRoleMutation.mutate(role.id)} 
                        className="bg-red-600 hover:bg-red-700"
                        disabled={dependencyCount > 0}
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
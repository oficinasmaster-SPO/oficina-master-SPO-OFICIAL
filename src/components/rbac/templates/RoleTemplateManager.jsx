import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function RoleTemplateManager({ onEdit }) {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['roleTemplates'],
    queryFn: () => base44.entities.RoleTemplate.list('-usage_count'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RoleTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roleTemplates']);
      toast.success('Template excluído com sucesso!');
    },
    onError: (err) => toast.error('Erro ao excluir template: ' + err.message)
  });

  if (isLoading) return <div className="text-center p-4">Carregando templates...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-base">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {template.name}
              </span>
              {template.is_system && <Badge variant="outline">Sistema</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">{template.description || 'Sem descrição'}</p>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>Permissões: {template.system_roles?.length || 0}</span>
              <span>Usado {template.usage_count || 0}x</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(template)} className="flex-1">
                <Edit className="w-3 h-3 mr-1" /> Editar
              </Button>
              {!template.is_system && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Template?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá deletar permanentemente o template "{template.name}". Roles já criadas não serão afetadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(template.id)} className="bg-red-600">
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';

export default function TemplateFormDialog({ 
  open, 
  onClose, 
  template, 
  type = 'profile',
  onSubmit, 
  isLoading,
  children 
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
    }
  });

  React.useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description || ''
      });
    }
  }, [template, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar' : 'Criar'} Template de {type === 'profile' ? 'Perfil' : 'Role'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label>Nome do Template *</Label>
            <Input {...register('name', { required: true })} placeholder="Ex: Template Desenvolvedor" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea {...register('description')} placeholder="Descreva as permissões incluídas neste template..." className="h-20" />
          </div>

          {children}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
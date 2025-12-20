import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SaveAsTemplateButton({ data, type = 'profile' }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entity = type === 'profile' ? 'ProfileTemplate' : 'RoleTemplate';
      const templateData = {
        name: templateName,
        description: templateDescription,
        ...data,
        is_system: false,
        usage_count: 0
      };
      return await base44.entities[entity].create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profileTemplates']);
      queryClient.invalidateQueries(['roleTemplates']);
      toast.success('Template salvo com sucesso!');
      setDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: (err) => toast.error('Erro ao salvar template: ' + err.message)
  });

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Salvar como Template
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Template</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Template Gerente de Loja"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Descreva o uso deste template..."
                className="h-20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => saveMutation.mutate()}
                disabled={!templateName.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AddSubtaskDialog({ open, onClose, actionId, diagnosticId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    responsible_user_id: "",
    due_date: "",
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (data) => {
      const subtask = await base44.entities.Subtask.create(data);
      
      // Criar notificação para o responsável
      if (data.responsible_user_id) {
        await base44.entities.Notification.create({
          user_id: data.responsible_user_id,
          subtask_id: subtask.id,
          type: "nova_subtarefa",
          title: "Nova subtarefa atribuída",
          message: `Você foi designado para: "${data.title}"`,
          is_read: false
        });

        // Enviar e-mail
        const responsible = users.find(u => u.id === data.responsible_user_id);
        if (responsible?.email) {
          await base44.integrations.Core.SendEmail({
            to: responsible.email,
            subject: "Nova Tarefa Atribuída - Oficinas Master",
            body: `
Olá ${responsible.full_name || 'Colaborador'},

Você recebeu uma nova tarefa:

📋 Tarefa: ${data.title}
📅 Prazo: ${data.due_date ? new Date(data.due_date).toLocaleDateString('pt-BR') : 'Não definido'}

${data.description ? `Descrição: ${data.description}` : ''}

Acesse o sistema para mais detalhes.

Atenciosamente,
Equipe Oficinas Master
            `
          });
        }
      }

      return subtask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['subtasks']);
      toast.success("Subtarefa criada com sucesso!");
      onClose();
      setFormData({
        title: "",
        description: "",
        responsible_user_id: "",
        due_date: "",
      });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar subtarefa");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Por favor, informe o título da subtarefa");
      return;
    }

    createSubtaskMutation.mutate({
      action_id: actionId,
      ...formData,
      status: "a_fazer",
      order: Date.now()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Subtarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Subtarefa *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Treinar equipe no GPS de Vendas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre a tarefa..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Select
                value={formData.responsible_user_id}
                onValueChange={(value) => setFormData({ ...formData, responsible_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Prazo</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createSubtaskMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createSubtaskMutation.isLoading ? "Criando..." : "Criar Subtarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
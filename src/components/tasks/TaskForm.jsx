import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import ReminderSettings from "./ReminderSettings";
import TaskDependencies from "./TaskDependencies";

export default function TaskForm({ task, employees, onSubmit, onCancel, submitting, allTasks = [] }) {
  const [formData, setFormData] = useState(task || {
    title: "",
    description: "",
    status: "pendente",
    priority: "media",
    assigned_to: [],
    assigned_team: "",
    due_date: "",
    progress: 0,
    tags: [],
    dependencies: [],
    reminder_settings: {
      enabled: true,
      email_reminder: true,
      app_notification: true,
      reminder_before: []
    }
  });

  const [newTag, setNewTag] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleAssignee = (userId) => {
    const assigned = formData.assigned_to || [];
    if (assigned.includes(userId)) {
      setFormData({ ...formData, assigned_to: assigned.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assigned_to: [...assigned, userId] });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Digite o título da tarefa"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva os detalhes da tarefa"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="datetime-local"
                value={formData.due_date ? new Date(formData.due_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              />
            </div>

            <div>
              <Label>Equipe</Label>
              <Select
                value={formData.assigned_team}
                onValueChange={(value) => setFormData({ ...formData, assigned_team: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="gerencia">Gerência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Atribuir a Usuários</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {employees.map(emp => (
                  <Badge
                    key={emp.id}
                    variant={formData.assigned_to?.includes(emp.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAssignee(emp.id)}
                  >
                    {emp.full_name}
                  </Badge>
                ))}
              </div>
            </div>

            {formData.status === 'em_andamento' && (
              <div>
                <Label>Progresso (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Dependências */}
          <TaskDependencies
            dependencies={formData.dependencies || []}
            allTasks={allTasks}
            currentTaskId={task?.id}
            onChange={(deps) => setFormData({ ...formData, dependencies: deps })}
          />

          {/* Configurações de Lembretes */}
          <ReminderSettings
            settings={formData.reminder_settings}
            onChange={(settings) => setFormData({ ...formData, reminder_settings: settings })}
          />

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                task ? 'Atualizar' : 'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Save, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function AdminMensagens() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({
    content: "",
    category: "bom_dia",
    tone: "inspirador",
    active: true
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['motivation-templates'],
    queryFn: async () => {
      const result = await base44.entities.MotivationTemplate.list();
      return Array.isArray(result) ? result : [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MotivationTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivation-templates']);
      toast.success("Template criado com sucesso!");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MotivationTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivation-templates']);
      toast.success("Template atualizado!");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MotivationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['motivation-templates']);
      toast.success("Template removido!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentTemplate) {
      updateMutation.mutate({ id: currentTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template) => {
    setCurrentTemplate(template);
    setFormData(template);
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({ content: "", category: "bom_dia", tone: "inspirador", active: true });
    setCurrentTemplate(null);
    setIsEditing(false);
  };

  const getCategoryLabel = (cat) => {
    const map = {
      bom_dia: "Bom Dia / Início",
      meta_batida: "Meta Batida",
      alerta_atraso: "Alerta Atraso",
      fechamento_semana: "Fechamento Semana",
      aniversario: "Aniversário"
    };
    return map[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-green-600" />
              Templates de Mensagens
            </h1>
            <p className="text-gray-600 mt-1">
              Configure as mensagens automáticas que serão enviadas aos colaboradores.
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Template
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          {isEditing && (
            <Card className="lg:col-span-1 h-fit border-green-100 shadow-md">
              <CardHeader>
                <CardTitle>{currentTemplate ? 'Editar Template' : 'Novo Template'}</CardTitle>
                <CardDescription>Use {'{nome}'} para o nome do colaborador.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={v => setFormData({...formData, category: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bom_dia">Bom Dia / Motivação</SelectItem>
                        <SelectItem value="meta_batida">Comemoração Meta</SelectItem>
                        <SelectItem value="alerta_atraso">Alerta Suave</SelectItem>
                        <SelectItem value="fechamento_semana">Resumo Semanal</SelectItem>
                        <SelectItem value="aniversario">Aniversário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tom de Voz</Label>
                    <Select 
                      value={formData.tone} 
                      onValueChange={v => setFormData({...formData, tone: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspirador">Inspirador</SelectItem>
                        <SelectItem value="divertido">Divertido</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="direto">Direto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Conteúdo da Mensagem</Label>
                    <Textarea 
                      rows={5}
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder="Ex: Bom dia {nome}! Vamos com tudo bater a meta hoje!"
                      className="resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* List Section */}
          <div className={isEditing ? "lg:col-span-2" : "lg:col-span-3"}>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" /></div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum template cadastrado.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {templates.map(template => (
                  <Card key={template.id} className="hover:shadow-md transition-all group relative">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="capitalize bg-gray-50">
                          {getCategoryLabel(template.category)}
                        </Badge>
                        <Badge className={`
                          ${template.tone === 'divertido' ? 'bg-yellow-100 text-yellow-800' : 
                            template.tone === 'formal' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}
                        `}>
                          {template.tone}
                        </Badge>
                      </div>
                      <p className="text-gray-800 italic mb-4">"{template.content}"</p>
                      
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-8 w-8" 
                          onClick={() => handleEdit(template)}
                        >
                          <span className="sr-only">Editar</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="h-8 w-8" 
                          onClick={() => {
                            if(confirm('Excluir template?')) deleteMutation.mutate(template.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
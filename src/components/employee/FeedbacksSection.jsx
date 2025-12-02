import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Users, Wand2, Printer, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FeedbacksSection({ employee, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [formData, setFormData] = useState({
    type: "one_on_one",
    content: ""
  });
  
  const [filters, setFilters] = useState({
    month: "all",
    type: "all"
  });

  const handleAdd = async () => {
    if (!formData.content.trim()) {
      toast.error("Digite o conteúdo do feedback");
      return;
    }

    const user = await base44.auth.me();
    
    const newFeedback = {
      date: new Date().toISOString(),
      type: formData.type,
      content: formData.content,
      created_by: user.email
    };

    const updatedFeedbacks = [...(employee.feedbacks || []), newFeedback];
    
    await onUpdate({ feedbacks: updatedFeedbacks });
    setShowDialog(false);
    setFormData({ type: "one_on_one", content: "" });
  };

  const generateWithAI = async () => {
    if (!formData.type) return;
    setGeneratingAI(true);
    try {
      const prompt = `Escreva um modelo de ${formData.type === 'positivo' ? 'feedback positivo' : formData.type === 'negativo' ? 'feedback corretivo/negativo' : 'pauta para reunião one-on-one'} para um colaborador chamado ${employee.full_name}, cargo ${employee.position}. 
      ${formData.type === 'one_on_one' ? 'Inclua perguntas chave para alinhamento e espaço para registrar metas.' : 'Seja profissional, construtivo e direto.'}`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });
      
      setFormData({ ...formData, content: response });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar com IA");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleTypeChange = (value) => {
    let content = "";
    if (value === "one_on_one") {
      content = "**Pauta One-on-One**\n\n1. Como você está se sentindo no trabalho?\n2. Principais conquistas desde a última conversa:\n3. Desafios/Bloqueios encontrados:\n4. Feedback do Gestor:\n5. Plano de Ação/Metas para próxima semana:\n";
    }
    setFormData({ type: value, content: content || formData.content });
  };

  const exportToPDF = async () => {
    try {
      toast.info("Gerando PDF...");
      const { data } = await base44.functions.invoke('generateEmployeeReport', {
        type: 'feedbacks',
        employee_name: employee.full_name,
        items: filteredFeedbacks
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedbacks_${employee.full_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const feedbackIcons = {
    positivo: ThumbsUp,
    negativo: ThumbsDown,
    one_on_one: Users
  };

  const feedbackColors = {
    positivo: "border-green-200 bg-green-50",
    negativo: "border-red-200 bg-red-50",
    one_on_one: "border-blue-200 bg-blue-50"
  };

  const filteredFeedbacks = (employee.feedbacks || []).filter(fb => {
    const date = new Date(fb.date);
    const monthMatch = filters.month === "all" || (date.getMonth() + 1) === parseInt(filters.month);
    const typeMatch = filters.type === "all" || fb.type === filters.type;
    return monthMatch && typeMatch;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedbacks e One-on-One
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Printer className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={() => setShowDialog(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-2 mt-4">
          <div className="w-32">
            <Select value={filters.month} onValueChange={(v) => setFilters({...filters, month: v})}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Meses</SelectItem>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="negativo">Negativo</SelectItem>
                <SelectItem value="one_on_one">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFeedbacks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum registro encontrado</p>
        ) : (
          <div className="space-y-3">
            {filteredFeedbacks.map((feedback, index) => {
              const Icon = feedbackIcons[feedback.type];
              return (
                <div key={index} className={`p-4 rounded-lg border-2 ${feedbackColors[feedback.type]}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize">{feedback.type.replace('_', ' ')}</span>
                        <span className="text-sm text-gray-600">
                          {new Date(feedback.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.content}</p>
                      <p className="text-xs text-gray-500 mt-2">Por: {feedback.created_by}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Feedback / 1:1</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Registro</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positivo">Feedback Positivo</SelectItem>
                  <SelectItem value="negativo">Feedback Negativo</SelectItem>
                  <SelectItem value="one_on_one">Registro One-on-One 1:1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <Label>Conteúdo</Label>
                <Button variant="ghost" size="xs" onClick={generateWithAI} disabled={generatingAI} className="text-purple-600 h-6">
                  <Wand2 className="w-3 h-3 mr-1" />
                  {generatingAI ? "Gerando..." : "Gerar Sugestão com IA"}
                </Button>
              </div>
              <Textarea
                rows={10}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Descreva o feedback ou pontos da conversa 1:1..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button onClick={handleAdd}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
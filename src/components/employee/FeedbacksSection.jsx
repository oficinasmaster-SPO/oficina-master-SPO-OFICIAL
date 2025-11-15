import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, ThumbsUp, ThumbsDown, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FeedbacksSection({ employee, onUpdate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: "one_on_one",
    content: ""
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedbacks e One-on-One
          </CardTitle>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!employee.feedbacks || employee.feedbacks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum feedback registrado</p>
        ) : (
          <div className="space-y-3">
            {employee.feedbacks.map((feedback, index) => {
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
                      <p className="text-sm text-gray-700">{feedback.content}</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Feedback</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
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
              <Label>Conteúdo</Label>
              <Textarea
                rows={6}
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
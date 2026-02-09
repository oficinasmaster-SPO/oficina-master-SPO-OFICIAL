import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FeedbackManager({ employeeId, workshopId, managerId }) {
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    feedback_type: "reconhecimento",
    title: "",
    content: "",
    action_plan: ""
  });

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['employee-feedbacks', employeeId],
    queryFn: () => base44.entities.PerformanceFeedback.filter({ employee_id: employeeId }),
    enabled: !!employeeId
  });

  const createFeedback = useMutation({
    mutationFn: (data) => base44.entities.PerformanceFeedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-feedbacks']);
      toast.success("Feedback registrado!");
      setShowDialog(false);
      setFormData({
        feedback_type: "reconhecimento",
        title: "",
        content: "",
        action_plan: ""
      });
    }
  });

  const acknowledgeFeedback = useMutation({
    mutationFn: ({ id, response }) => base44.entities.PerformanceFeedback.update(id, {
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      employee_response: response,
      status: "reconhecido"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-feedbacks']);
      toast.success("Feedback reconhecido!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createFeedback.mutate({
      employee_id: employeeId,
      manager_id: managerId,
      workshop_id: workshopId,
      ...formData
    });
  };

  const typeColors = {
    reconhecimento: "bg-green-100 text-green-700",
    construtivo: "bg-blue-100 text-blue-700",
    alerta: "bg-orange-100 text-orange-700",
    one_on_one: "bg-purple-100 text-purple-700"
  };

  const typeIcons = {
    reconhecimento: CheckCircle2,
    construtivo: MessageSquare,
    alerta: AlertTriangle,
    one_on_one: MessageSquare
  };

  if (isLoading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feedbacks de Desempenho</h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo Feedback</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo de Feedback</Label>
                <Select value={formData.feedback_type} onValueChange={(v) => setFormData({ ...formData, feedback_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reconhecimento">Reconhecimento</SelectItem>
                    <SelectItem value="construtivo">Construtivo</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="one_on_one">One-on-One</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Conteúdo do Feedback</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={5}
                  required
                />
              </div>
              <div>
                <Label>Plano de Ação (opcional)</Label>
                <Textarea
                  value={formData.action_plan}
                  onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={createFeedback.isPending}>
                {createFeedback.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Registrar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {feedbacks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum feedback registrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback) => {
            const Icon = typeIcons[feedback.feedback_type];
            return (
              <Card key={feedback.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <div>
                        <CardTitle className="text-base">{feedback.title || "Sem título"}</CardTitle>
                        <p className="text-xs text-gray-500">
                          {format(new Date(feedback.created_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge className={typeColors[feedback.feedback_type]}>
                      {feedback.feedback_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-700">{feedback.content}</p>
                  
                  {feedback.action_plan && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-900 mb-1">Plano de Ação</p>
                      <p className="text-sm text-blue-700">{feedback.action_plan}</p>
                    </div>
                  )}

                  {feedback.acknowledged ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reconhecido em {format(new Date(feedback.acknowledged_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const response = prompt("Adicione uma resposta (opcional):");
                        acknowledgeFeedback.mutate({ id: feedback.id, response: response || "" });
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Reconhecer Feedback
                    </Button>
                  )}

                  {feedback.employee_response && (
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                      <p className="text-xs font-medium text-gray-700 mb-1">Resposta do Colaborador</p>
                      <p className="text-sm text-gray-600">{feedback.employee_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
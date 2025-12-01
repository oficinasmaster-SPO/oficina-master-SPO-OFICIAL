import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function COEXFeedbackList({ employeeId, contractId }) {
  const queryClient = useQueryClient();
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState("3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: reminders = [] } = useQuery({
    queryKey: ['coex-reminders', contractId],
    queryFn: () => base44.entities.COEXFeedbackReminder.filter({ contract_id: contractId }),
    enabled: !!contractId
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['coex-feedbacks', contractId],
    queryFn: () => base44.entities.COEXFeedback.filter({ contract_id: contractId }),
    enabled: !!contractId
  });

  const saveFeedbackMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      
      // 1. Create Feedback
      await base44.entities.COEXFeedback.create({
        contract_id: contractId,
        employee_id: employeeId,
        evaluator_id: currentUser.id,
        month_reference: selectedReminder.month_reference,
        feedback_text: feedbackText,
        compliance_rating: parseInt(rating),
        feedback_date: new Date().toISOString()
      });

      // 2. Update Reminder Status
      await base44.entities.COEXFeedbackReminder.update(selectedReminder.id, {
        status: 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coex-reminders']);
      queryClient.invalidateQueries(['coex-feedbacks']);
      toast.success("Feedback registrado com sucesso!");
      setSelectedReminder(null);
      setFeedbackText("");
      setRating("3");
    },
    onError: () => {
      toast.error("Erro ao registrar feedback.");
    }
  });

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      toast.error("Digite o feedback.");
      return;
    }
    setIsSubmitting(true);
    try {
      await saveFeedbackMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merge reminders with existing feedbacks to show history
  const sortedReminders = [...reminders].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <Card className="mt-6 border-t-4 border-t-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Acompanhamento Mensal do COEX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sortedReminders.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lembrete de feedback agendado.</p>
          ) : (
            sortedReminders.map((reminder) => {
              const feedback = feedbacks.find(f => f.month_reference === reminder.month_reference);
              const isPending = reminder.status === 'pending';
              const isOverdue = isPending && new Date(reminder.due_date) < new Date();

              return (
                <div key={reminder.id} className={`border rounded-lg p-4 ${isPending ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">
                        Referência: {format(new Date(reminder.due_date), 'MMMM/yyyy', { locale: ptBR })}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Prazo: {format(new Date(reminder.due_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      {feedback ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Realizado
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Atrasado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>

                  {feedback ? (
                    <div className="bg-white p-3 rounded border text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Nota: {feedback.compliance_rating}/5</span>
                        <span className="text-gray-400 text-xs">{format(new Date(feedback.feedback_date), "dd/MM 'às' HH:mm")}</span>
                      </div>
                      <p className="text-gray-600 italic">"{feedback.feedback_text}"</p>
                    </div>
                  ) : (
                    selectedReminder?.id === reminder.id ? (
                      <div className="mt-3 space-y-3 bg-blue-50 p-3 rounded border border-blue-100 animate-in fade-in zoom-in duration-300">
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Nível de Cumprimento do COEX (1-5)</label>
                          <Select value={rating} onValueChange={setRating}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Não cumpriu</SelectItem>
                              <SelectItem value="2">2 - Cumpriu pouco</SelectItem>
                              <SelectItem value="3">3 - Cumpriu parcialmente</SelectItem>
                              <SelectItem value="4">4 - Cumpriu bem</SelectItem>
                              <SelectItem value="5">5 - Superou expectativas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">Observações / Feedback</label>
                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Descreva como foi o desempenho do colaborador em relação ao COEX neste mês..."
                            className="bg-white text-sm"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedReminder(null)}>Cancelar</Button>
                          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Registrar Feedback
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2 border-dashed"
                        onClick={() => setSelectedReminder(reminder)}
                      >
                        Registrar Feedback
                      </Button>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
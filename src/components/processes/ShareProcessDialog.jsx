import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ShareProcessDialog({ open, onClose, process, workshop }) {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [message, setMessage] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ['workshop-employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      const allEmployees = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        user_status: 'ativo'
      });
      return allEmployees.filter(e => e.email);
    },
    enabled: !!workshop?.id && open
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (!employee) throw new Error("Colaborador não encontrado");

      const shareRecord = await base44.entities.ProcessShare.create({
        workshop_id: workshop.id,
        process_id: process.id,
        process_title: process.title,
        shared_by_id: (await base44.auth.me()).id,
        shared_by_name: (await base44.auth.me()).full_name,
        shared_with_email: employee.email,
        shared_with_name: employee.full_name,
        employee_id: employee.id,
        message: message || "",
        email_sent_at: new Date().toISOString(),
        status: "enviado"
      });

      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: `📋 Processo compartilhado: ${process.title}`,
        body: `
Olá ${employee.full_name},

${(await base44.auth.me()).full_name} compartilhou um processo com você:

📋 **${process.title}**
${process.code ? `Código: ${process.code}` : ''}

${message ? `\n**Mensagem:**\n${message}\n` : ''}

Acesse o processo pelo link abaixo:
${window.location.origin}/VisualizarProcesso?id=${process.id}

---
Oficinas Master - Sistema de Aceleração
        `.trim()
      });

      return shareRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-shares']);
      toast.success("Processo compartilhado com sucesso!");
      setSelectedEmployeeId("");
      setMessage("");
      onClose();
    },
    onError: (error) => {
      toast.error("Erro ao compartilhar: " + error.message);
    }
  });

  const handleShare = () => {
    if (!selectedEmployeeId) {
      toast.error("Selecione um colaborador");
      return;
    }
    shareMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Compartilhar Processo
          </DialogTitle>
          <DialogDescription>
            Envie <strong>{process?.title}</strong> por email para um colaborador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="employee">Colaborador</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee" className="mt-1.5">
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    Nenhum colaborador encontrado
                  </div>
                ) : (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Adicione uma mensagem personalizada..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1.5"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2 text-sm text-blue-800">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">O que acontece:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                  <li>Colaborador recebe email com link direto</li>
                  <li>Registro criado no histórico de compartilhamentos</li>
                  <li>Você pode acompanhar visualizações</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending || !selectedEmployeeId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {shareMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Compartilhar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
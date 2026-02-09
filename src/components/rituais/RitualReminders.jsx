import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail } from "lucide-react";
import { toast } from "sonner";

export default function RitualReminders({ schedule, open, onClose, employees }) {
  const [emailReminder, setEmailReminder] = useState(true);
  const [daysBefore, setDaysBefore] = useState([1]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (schedule?.participants) {
      setSelectedParticipants(schedule.participants.map(p => p.employee_id));
    }
  }, [schedule]);

  const handleToggleDay = (day) => {
    setDaysBefore(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleToggleParticipant = (empId) => {
    setSelectedParticipants(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSendReminders = async () => {
    if (selectedParticipants.length === 0) {
      toast.error("Selecione ao menos um participante");
      return;
    }

    setSending(true);
    try {
      const participantEmails = employees
        .filter(e => selectedParticipants.includes(e.id))
        .map(e => e.email)
        .filter(Boolean);

      for (const email of participantEmails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Lembrete: Ritual ${schedule.ritual_name}`,
          body: `
Olá!

Este é um lembrete sobre o ritual agendado:

📋 Ritual: ${schedule.ritual_name}
📅 Data: ${new Date(schedule.scheduled_date).toLocaleDateString()}
⏰ Horário: ${schedule.scheduled_time || "A definir"}

${schedule.notes ? `📝 Observações: ${schedule.notes}` : ""}

Por favor, esteja preparado(a) para participar.

Atenciosamente,
Sistema de Rituais
          `
        });
      }

      toast.success(`${participantEmails.length} lembrete(s) enviado(s)!`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar lembretes");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Lembretes do Ritual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold">{schedule?.ritual_name}</p>
            <p className="text-xs text-gray-600 mt-1">
              {new Date(schedule?.scheduled_date).toLocaleDateString()} às{" "}
              {schedule?.scheduled_time || "09:00"}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enviar por Email</Label>
              <p className="text-xs text-gray-500">
                Notificar participantes
              </p>
            </div>
            <Switch
              checked={emailReminder}
              onCheckedChange={setEmailReminder}
            />
          </div>

          {emailReminder && (
            <>
              <div className="space-y-2">
                <Label>Enviar Lembrete</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 7].map(day => (
                    <Button
                      key={day}
                      size="sm"
                      variant={daysBefore.includes(day) ? "default" : "outline"}
                      onClick={() => handleToggleDay(day)}
                    >
                      {day} dia{day > 1 ? "s" : ""} antes
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Participantes ({selectedParticipants.length})</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded-lg">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={emp.id}
                        checked={selectedParticipants.includes(emp.id)}
                        onCheckedChange={() => handleToggleParticipant(emp.id)}
                      />
                      <label
                        htmlFor={emp.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {emp.full_name}
                        {emp.email && (
                          <span className="text-xs text-gray-500 ml-2">
                            {emp.email}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSendReminders} disabled={sending}>
            <Mail className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar Lembretes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
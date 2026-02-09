import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Repeat, Calendar } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function RitualRecurrenceSettings({ ritual, open, onClose, workshop }) {
  const [autoSchedule, setAutoSchedule] = useState(ritual?.auto_schedule_enabled || false);
  const [scheduleTime, setScheduleTime] = useState(ritual?.auto_schedule_time || "09:00");
  const [scheduleDay, setScheduleDay] = useState(ritual?.auto_schedule_day || "monday");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Ritual.update(ritual.id, {
        auto_schedule_enabled: autoSchedule,
        auto_schedule_time: scheduleTime,
        auto_schedule_day: scheduleDay
      });

      toast.success("Configurações de recorrência salvas!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const frequencyInstructions = {
    diario: "Agendamentos serão criados automaticamente todos os dias",
    semanal: "Agendamentos serão criados automaticamente toda semana",
    quinzenal: "Agendamentos serão criados automaticamente a cada 15 dias",
    mensal: "Agendamentos serão criados automaticamente todo mês",
    continuo: "Ritual contínuo - sem agendamentos automáticos",
    eventual: "Ritual eventual - agendar manualmente"
  };

  const daysOfWeek = [
    { value: "monday", label: "Segunda-feira" },
    { value: "tuesday", label: "Terça-feira" },
    { value: "wednesday", label: "Quarta-feira" },
    { value: "thursday", label: "Quinta-feira" },
    { value: "friday", label: "Sexta-feira" },
    { value: "saturday", label: "Sábado" },
    { value: "sunday", label: "Domingo" }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-600" />
            Agendamento Automático
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Frequência:</strong> {ritual?.frequency}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {frequencyInstructions[ritual?.frequency]}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Agendamento Automático</Label>
              <p className="text-xs text-gray-500">
                Criar agendamentos automaticamente
              </p>
            </div>
            <Switch
              checked={autoSchedule}
              onCheckedChange={setAutoSchedule}
            />
          </div>

          {autoSchedule && (
            <>
              <div className="space-y-2">
                <Label>Horário Padrão</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>

              {(ritual?.frequency === "semanal" || ritual?.frequency === "quinzenal") && (
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select value={scheduleDay} onValueChange={setScheduleDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-800">
                  ✅ Os agendamentos serão criados automaticamente com base nessa configuração.
                  Você pode editá-los ou cancelá-los individualmente.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
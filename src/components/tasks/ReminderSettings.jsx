import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, X, Mail, Smartphone } from "lucide-react";

export default function ReminderSettings({ settings, onChange }) {
  const [newReminder, setNewReminder] = useState({ value: 1, unit: "hours" });

  const currentSettings = settings || {
    enabled: true,
    email_reminder: true,
    app_notification: true,
    reminder_before: []
  };

  const handleToggle = (field) => {
    onChange({
      ...currentSettings,
      [field]: !currentSettings[field]
    });
  };

  const addReminder = () => {
    if (newReminder.value > 0) {
      onChange({
        ...currentSettings,
        reminder_before: [
          ...(currentSettings.reminder_before || []),
          { ...newReminder }
        ]
      });
      setNewReminder({ value: 1, unit: "hours" });
    }
  };

  const removeReminder = (index) => {
    onChange({
      ...currentSettings,
      reminder_before: currentSettings.reminder_before.filter((_, i) => i !== index)
    });
  };

  const unitLabels = {
    minutes: "minutos",
    hours: "horas",
    days: "dias"
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-blue-600" />
          Configurações de Lembretes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Habilitar/Desabilitar */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <div>
              <Label className="font-medium">Ativar Lembretes</Label>
              <p className="text-xs text-gray-600">Receber notificações sobre esta tarefa</p>
            </div>
          </div>
          <Switch
            checked={currentSettings.enabled}
            onCheckedChange={() => handleToggle('enabled')}
          />
        </div>

        {currentSettings.enabled && (
          <>
            {/* Tipo de Lembrete */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label className="font-medium">Lembrete por E-mail</Label>
                    <p className="text-xs text-gray-600">Receber notificações no e-mail</p>
                  </div>
                </div>
                <Switch
                  checked={currentSettings.email_reminder}
                  onCheckedChange={() => handleToggle('email_reminder')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label className="font-medium">Notificação no App</Label>
                    <p className="text-xs text-gray-600">Receber notificações na plataforma</p>
                  </div>
                </div>
                <Switch
                  checked={currentSettings.app_notification}
                  onCheckedChange={() => handleToggle('app_notification')}
                />
              </div>
            </div>

            {/* Lembretes Personalizados */}
            <div className="p-3 bg-white rounded-lg space-y-3">
              <Label className="font-medium">Lembretes Antes do Vencimento</Label>
              
              {/* Lista de Lembretes */}
              {currentSettings.reminder_before?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentSettings.reminder_before.map((reminder, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      {reminder.value} {unitLabels[reminder.unit]}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-600"
                        onClick={() => removeReminder(index)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Adicionar Novo Lembrete */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={newReminder.value}
                  onChange={(e) => setNewReminder({ ...newReminder, value: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <Select
                  value={newReminder.unit}
                  onValueChange={(value) => setNewReminder({ ...newReminder, unit: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  onClick={addReminder}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              <p className="text-xs text-gray-600">
                💡 Você será notificado nos momentos especificados antes do vencimento da tarefa
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
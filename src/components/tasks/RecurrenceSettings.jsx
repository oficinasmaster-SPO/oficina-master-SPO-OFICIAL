import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repeat, Calendar } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: "domingo", label: "Dom" },
  { value: "segunda", label: "Seg" },
  { value: "terca", label: "Ter" },
  { value: "quarta", label: "Qua" },
  { value: "quinta", label: "Qui" },
  { value: "sexta", label: "Sex" },
  { value: "sabado", label: "Sáb" }
];

export default function RecurrenceSettings({ settings, onChange }) {
  const isRecurring = settings?.is_recurring || false;
  const pattern = settings?.recurrence_pattern || "";
  const days = settings?.recurrence_days || [];
  const endDate = settings?.recurrence_end_date || "";

  const handleToggle = (checked) => {
    onChange({
      ...settings,
      is_recurring: checked,
      recurrence_pattern: checked ? "diariamente" : "",
      recurrence_days: [],
      recurrence_end_date: ""
    });
  };

  const handlePatternChange = (value) => {
    onChange({
      ...settings,
      recurrence_pattern: value,
      recurrence_days: value === "personalizado" ? [] : settings?.recurrence_days
    });
  };

  const handleDayToggle = (day) => {
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day];
    onChange({
      ...settings,
      recurrence_days: newDays
    });
  };

  const handleEndDateChange = (value) => {
    onChange({
      ...settings,
      recurrence_end_date: value
    });
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-600" />
            Tarefa Recorrente
          </CardTitle>
          <Switch
            checked={isRecurring}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>

      {isRecurring && (
        <CardContent className="space-y-4">
          <div>
            <Label>Frequência</Label>
            <Select value={pattern} onValueChange={handlePatternChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diariamente">Diariamente</SelectItem>
                <SelectItem value="semanalmente">Semanalmente</SelectItem>
                <SelectItem value="quinzenalmente">Quinzenalmente</SelectItem>
                <SelectItem value="mensalmente">Mensalmente</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pattern === "personalizado" && (
            <div>
              <Label className="mb-2 block">Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <div
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={`
                      px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium
                      ${days.includes(day.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                      }
                    `}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Final da Recorrência (Opcional)
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se não definir, a tarefa se repetirá indefinidamente
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
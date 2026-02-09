import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Timer, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TimeTrackingSettings({ 
  predictedTime = 0, 
  actualTime = 0, 
  timeTracking = [], 
  onChange,
  isEditing = true 
}) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStart, setTrackingStart] = useState(null);

  const handlePredictedChange = (value) => {
    onChange({
      predicted_time_minutes: parseInt(value) || 0,
      actual_time_minutes: actualTime,
      time_tracking: timeTracking
    });
  };

  const handleActualChange = (value) => {
    onChange({
      predicted_time_minutes: predictedTime,
      actual_time_minutes: parseInt(value) || 0,
      time_tracking: timeTracking
    });
  };

  const startTracking = () => {
    setIsTracking(true);
    setTrackingStart(new Date());
  };

  const stopTracking = () => {
    if (trackingStart) {
      const endTime = new Date();
      const durationMinutes = Math.round((endTime - trackingStart) / 60000);
      
      const newEntry = {
        start_time: trackingStart.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes
      };

      const newTotal = actualTime + durationMinutes;

      onChange({
        predicted_time_minutes: predictedTime,
        actual_time_minutes: newTotal,
        time_tracking: [...timeTracking, newEntry]
      });
    }

    setIsTracking(false);
    setTrackingStart(null);
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return "0min";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getEfficiencyStatus = () => {
    if (!predictedTime || !actualTime) return null;
    const diff = actualTime - predictedTime;
    const percentage = Math.round((diff / predictedTime) * 100);
    
    if (percentage <= -10) {
      return { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100", label: `${Math.abs(percentage)}% mais rápido` };
    } else if (percentage >= 10) {
      return { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100", label: `${percentage}% mais lento` };
    }
    return { icon: Minus, color: "text-blue-600", bg: "bg-blue-100", label: "Dentro do previsto" };
  };

  const efficiency = getEfficiencyStatus();

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-600" />
          Controle de Tempo
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo Previsto (min)
            </Label>
            <Input
              type="number"
              min="0"
              value={predictedTime || ""}
              onChange={(e) => handlePredictedChange(e.target.value)}
              placeholder="Ex: 60"
              disabled={!isEditing}
            />
            <p className="text-xs text-gray-500 mt-1">{formatMinutes(predictedTime)}</p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Tempo Executado (min)
            </Label>
            <Input
              type="number"
              min="0"
              value={actualTime || ""}
              onChange={(e) => handleActualChange(e.target.value)}
              placeholder="Ex: 45"
              disabled={!isEditing}
            />
            <p className="text-xs text-gray-500 mt-1">{formatMinutes(actualTime)}</p>
          </div>
        </div>

        {efficiency && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${efficiency.bg}`}>
            <efficiency.icon className={`w-5 h-5 ${efficiency.color}`} />
            <span className={`font-medium ${efficiency.color}`}>{efficiency.label}</span>
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2">
            {!isTracking ? (
              <Button
                type="button"
                onClick={startTracking}
                variant="outline"
                className="flex-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Cronômetro
              </Button>
            ) : (
              <Button
                type="button"
                onClick={stopTracking}
                variant="outline"
                className="flex-1 bg-red-50 hover:bg-red-100 border-red-200 text-red-700 animate-pulse"
              >
                <Square className="w-4 h-4 mr-2" />
                Parar ({Math.round((new Date() - trackingStart) / 60000)} min)
              </Button>
            )}
          </div>
        )}

        {timeTracking.length > 0 && (
          <div>
            <Label className="mb-2 block">Histórico de Registros</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {timeTracking.slice(-5).map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                  <span className="text-gray-600">
                    {entry.start_time && format(new Date(entry.start_time), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                  <Badge variant="outline">{entry.duration_minutes} min</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
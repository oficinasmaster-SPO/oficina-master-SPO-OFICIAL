import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Clock } from "lucide-react";
import { toast } from "sonner";

export default function MeetingTimer({ onTimerData }) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualStartTime, setManualStartTime] = useState("");

  useEffect(() => {
    let interval = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setIsRunning(true);
    toast.success("Timer iniciado!");
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info("Timer pausado");
  };

  const handleStop = () => {
    const now = new Date();
    setEndTime(now);
    setIsRunning(false);
    
    if (startTime) {
      const duration = Math.floor((now - startTime) / 60000); // em minutos
      onTimerData({
        hora_inicio_real: startTime.toISOString(),
        hora_fim_real: now.toISOString(),
        duracao_real_minutos: duration
      });
      toast.success(`Reunião finalizada: ${duration} minutos`);
    }
  };

  const handleManualTimeAdjust = () => {
    if (manualStartTime) {
      try {
        const adjustedStart = new Date(manualStartTime);
        setStartTime(adjustedStart);
        toast.success("Hora de início ajustada!");
      } catch (error) {
        toast.error("Hora inválida");
      }
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timer da Reunião
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-4">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="flex gap-2 justify-center">
            {!isRunning && !startTime && (
              <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            )}
            {isRunning && (
              <>
                <Button onClick={handlePause} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
                <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700">
                  <Square className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
            {!isRunning && startTime && !endTime && (
              <>
                <Button onClick={() => setIsRunning(true)} className="bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Continuar
                </Button>
                <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700">
                  <Square className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        </div>

        {startTime && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm text-gray-600">
              <strong>Início:</strong> {startTime.toLocaleTimeString('pt-BR')}
            </div>
            {endTime && (
              <div className="text-sm text-gray-600">
                <strong>Fim:</strong> {endTime.toLocaleTimeString('pt-BR')}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={manualStartTime}
                onChange={(e) => setManualStartTime(e.target.value)}
                className="text-sm"
                placeholder="Ajustar hora início"
              />
              <Button size="sm" onClick={handleManualTimeAdjust}>
                Ajustar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function AudioTranscriptionField({ label, value, onChange, placeholder, rows = 4 }) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleAudioComplete = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      // Upload do áudio
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Transcrever
      const { data: transcription } = await base44.functions.invoke('transcribeAudio', {
        audio_url: file_url
      });

      // Adicionar ao texto existente
      const newText = value 
        ? `${value}\n\n[Áudio transcrito]\n${transcription.text}`
        : `[Áudio transcrito]\n${transcription.text}`;
      
      onChange(newText);
      setShowRecorder(false);
      toast.success("Áudio transcrito com sucesso!");
    } catch (error) {
      console.error("Erro na transcrição:", error);
      toast.error("Erro ao transcrever áudio: " + error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowRecorder(!showRecorder)}
          disabled={isTranscribing}
        >
          <Mic className="w-4 h-4 mr-2" />
          {showRecorder ? "Cancelar" : "Gravar Áudio"}
        </Button>
      </div>

      {showRecorder && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <AudioRecorder
            onRecordingComplete={handleAudioComplete}
            onCancel={() => setShowRecorder(false)}
          />
        </div>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Transcrevendo áudio com IA...</span>
        </div>
      )}

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={isTranscribing}
      />
    </div>
  );
}
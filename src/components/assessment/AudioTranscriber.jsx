import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AudioTranscriber({ onTranscription, placeholder = "Gravar áudio..." }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success("Gravação iniciada");
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast.error("Erro ao acessar microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      const transcriptionResult = await base44.functions.invoke('transcribeAudio', {
        audio_url: uploadResult.file_url
      });

      if (transcriptionResult?.data?.success && transcriptionResult.data.text) {
        onTranscription(transcriptionResult.data.text.trim());
        toast.success("Áudio transcrito com sucesso!");
      } else {
        toast.error("Erro ao transcrever áudio");
      }
    } catch (error) {
      console.error("Erro ao transcrever:", error);
      toast.error("Erro ao transcrever áudio: " + error.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording && !isTranscribing && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          className="flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          {placeholder}
        </Button>
      )}

      {isRecording && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="flex items-center gap-2 animate-pulse"
        >
          <Square className="w-4 h-4" />
          Parar Gravação
        </Button>
      )}

      {isTranscribing && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Transcrevendo áudio...
        </div>
      )}
    </div>
  );
}
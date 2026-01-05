import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AudioRecorder({ onAudioSave, existingAudioUrl }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null);
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
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Upload para o servidor
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        
        try {
          const { data } = await base44.integrations.Core.UploadFile({ file: blob });
          onAudioSave(data.file_url);
          toast.success("Áudio salvo!");
        } catch (error) {
          toast.error("Erro ao salvar áudio");
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.info("Gravação iniciada");
    } catch (error) {
      toast.error("Erro ao acessar microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteAudio = () => {
    setAudioUrl(null);
    onAudioSave(null);
    toast.success("Áudio removido");
  };

  return (
    <div className="flex items-center gap-2">
      {!audioUrl ? (
        <>
          {!isRecording ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={startRecording}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              Gravar Áudio
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="gap-2 animate-pulse"
            >
              <Square className="w-4 h-4" />
              Parar Gravação
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
          <audio src={audioUrl} controls className="h-8" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={deleteAudio}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      )}
    </div>
  );
}
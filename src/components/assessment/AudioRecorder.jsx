import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AudioRecorder({ audioUrl, onAudioChange }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      toast.error("Erro ao acessar microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudio = async (blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const response = await base44.integrations.Core.UploadFile({ file });
      onAudioChange(response.file_url);
      toast.success("Áudio salvo");
    } catch (error) {
      toast.error("Erro ao fazer upload do áudio");
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = () => {
    onAudioChange(null);
    toast.success("Áudio excluído");
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!recording && !audioUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          disabled={uploading}
        >
          <Mic className="w-4 h-4 mr-1" />
          Gravar
        </Button>
      )}

      {recording && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4 mr-1" />
          Parar
        </Button>
      )}

      {uploading && (
        <Button type="button" variant="ghost" size="sm" disabled>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          Enviando...
        </Button>
      )}

      {audioUrl && !uploading && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={playAudio}
          >
            <Play className="w-4 h-4 mr-1" />
            Ouvir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deleteAudio}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir
          </Button>
        </>
      )}
    </div>
  );
}
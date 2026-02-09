import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Componente unificado de gravação de áudio
 * Usado em todos os diagnósticos e avaliações
 */
export default function UnifiedAudioRecorder({ 
  existingAudioUrl, 
  onAudioRecorded,
  disabled = false,
  showTranscription = false,
  onTranscriptionComplete
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    setAudioUrl(existingAudioUrl || null);
  }, [existingAudioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && !existingAudioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, existingAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleAudioUpload = async (blob) => {
    setIsUploading(true);
    try {
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setAudioUrl(file_url);
      onAudioRecorded?.(file_url);
      toast.success('Áudio salvo com sucesso!');

      // Se transcrição estiver habilitada, executar automaticamente
      if (showTranscription && onTranscriptionComplete) {
        await handleTranscription(file_url);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao salvar áudio. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTranscription = async (urlToTranscribe) => {
    const url = urlToTranscribe || audioUrl;
    if (!url) return;

    setIsTranscribing(true);
    try {
      const result = await base44.functions.invoke('transcribeAudio', {
        audio_url: url
      });

      if (result.data?.text) {
        onTranscriptionComplete?.(result.data.text);
        toast.success('Áudio transcrito com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao transcrever:', error);
      toast.error('Erro ao transcrever áudio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const deleteAudio = () => {
    setAudioUrl(null);
    onAudioRecorded?.(null);
    toast.success('Áudio excluído');
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Timer (apenas durante gravação) */}
      {isRecording && (
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 font-mono">
            {formatTime(recordingTime)}
          </div>
          <div className="flex items-center justify-center gap-2 text-red-600 mt-1">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-xs font-medium">Gravando...</span>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isRecording && !audioUrl && !isUploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic className="w-4 h-4 mr-1" />
            Gravar
          </Button>
        )}

        {isRecording && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
          >
            <Square className="w-4 h-4 mr-1" />
            Parar Gravação
          </Button>
        )}

        {isUploading && (
          <Button type="button" variant="ghost" size="sm" disabled>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Salvando...
          </Button>
        )}

        {audioUrl && !isUploading && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Reproduzir
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deleteAudio}
              disabled={disabled}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>

            {showTranscription && onTranscriptionComplete && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleTranscription()}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Transcrevendo...
                  </>
                ) : (
                  'Transcrever'
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Status */}
      {audioUrl && (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
          Áudio salvo
        </div>
      )}
    </div>
  );
}
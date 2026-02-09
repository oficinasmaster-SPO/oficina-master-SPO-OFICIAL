import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AudioRecorder({ onAudioRecorded, onRecordingComplete, onCancel, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

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

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        clearInterval(timerRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setAudioBlob(null);
    setRecordingTime(0);
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

  const uploadAudio = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      if (onRecordingComplete) {
        // Modo direto: retorna blob para processamento externo
        onRecordingComplete(audioBlob);
        deleteRecording();
      } else if (onAudioRecorded) {
        // Modo legado: faz upload e retorna URL
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onAudioRecorded(file_url, recordingTime);
        deleteRecording();
      }
    } catch (error) {
      console.error('Erro ao processar áudio:', error);
      alert('Erro ao processar áudio. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="text-4xl font-bold text-blue-600 font-mono">
            {formatTime(recordingTime)}
          </div>
        </div>

        {!audioURL ? (
          <div className="flex items-center justify-center gap-3">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={disabled}
                className="bg-red-600 hover:bg-red-700"
              >
                <Mic className="w-5 h-5 mr-2" />
                Iniciar Gravação
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={pauseRecording}
                  disabled={disabled}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Retomar
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pausar
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  onClick={stopRecording}
                  disabled={disabled}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={audioURL}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={togglePlayback}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Reproduzir
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteRecording}
                disabled={isUploading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              
              <Button
                size="sm"
                onClick={uploadAudio}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Processando...' : 'Usar Áudio'}
              </Button>
              
              {onCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {isPaused ? 'Gravação pausada' : 'Gravando...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
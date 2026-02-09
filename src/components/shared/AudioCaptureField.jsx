import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * COMPONENTE ROBUSTO ÚNICO DE ÁUDIO
 * Proteções: race conditions, cleanup, retry, timeout, validação
 * Modos: 'simple' (só áudio) ou 'transcribe' (áudio + transcrição automática)
 */
export default function AudioCaptureField({ 
  existingAudioUrl = null,
  onAudioSaved,
  onTranscribed,
  mode = 'simple', // 'simple' ou 'transcribe'
  disabled = false,
  showManualTranscribe = false // Mostrar botão "Transcrever" manual
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  const uploadAbortControllerRef = useRef(null);

  // Sync com existingAudioUrl
  useEffect(() => {
    setAudioUrl(existingAudioUrl);
  }, [existingAudioUrl]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      log('Component unmounting - cleanup');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          log('Stream track stopped on cleanup');
        });
      }
      
      if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
      }
    };
  }, []);

  const log = (message, data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[AudioCapture ${timestamp}] ${message}`, data || '');
  };

  const startRecording = async () => {
    try {
      log('Starting recording...');
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          log(`Chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        log('MediaRecorder stopped');
        handleRecordingComplete();
      };

      mediaRecorderRef.current.onerror = (event) => {
        log('MediaRecorder error', event.error);
        toast.error('Erro na gravação: ' + event.error);
      };

      mediaRecorderRef.current.start(1000); // Chunk a cada 1s para garantir dados
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      log('Recording started successfully');
    } catch (error) {
      log('Failed to start recording', error);
      setError('Erro ao acessar microfone');
      toast.error('Erro ao acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleRecordingComplete = async () => {
    log('Processing recording...');
    
    // Validar chunks
    if (audioChunksRef.current.length === 0) {
      log('ERROR: No audio chunks received');
      toast.error('Erro: Nenhum dado de áudio capturado. Tente novamente.');
      cleanupStream();
      return;
    }

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    log(`Blob created: ${blob.size} bytes`);
    
    // Validar tamanho mínimo
    if (blob.size < 1024) { // 1KB
      log(`ERROR: Blob too small (${blob.size} bytes)`);
      toast.error('Gravação muito curta ou sem áudio. Tente novamente.');
      cleanupStream();
      return;
    }

    // Upload com proteção
    await uploadAudioWithRetry(blob);
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        log('Stream track stopped');
      });
      streamRef.current = null;
    }
  };

  const uploadAudioWithRetry = async (blob, attempt = 1) => {
    const maxAttempts = 2;
    
    if (!isMountedRef.current) {
      log('Component unmounted - aborting upload');
      cleanupStream();
      return;
    }

    setIsUploading(true);
    log(`Upload attempt ${attempt}/${maxAttempts}`, { blobSize: blob.size });

    try {
      uploadAbortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        log('Upload timeout (30s)');
        uploadAbortControllerRef.current.abort();
      }, 30000);

      const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      clearTimeout(timeoutId);
      log('Upload success', { url: file_url });

      if (!isMountedRef.current) {
        log('Component unmounted after upload - state not updated');
        cleanupStream();
        return;
      }

      setAudioUrl(file_url);
      onAudioSaved?.(file_url);
      toast.success('Áudio salvo com sucesso!');

      // Transcrição automática se modo transcribe
      if (mode === 'transcribe' && onTranscribed) {
        await transcribeAudioWithRetry(file_url);
      }
    } catch (error) {
      log(`Upload failed (attempt ${attempt})`, error);
      
      if (error.name === 'AbortError') {
        toast.error('Upload demorou muito. Verifique sua conexão.');
      } else if (attempt < maxAttempts) {
        log(`Retrying upload... (${attempt + 1}/${maxAttempts})`);
        toast.info(`Tentando novamente... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return uploadAudioWithRetry(blob, attempt + 1);
      } else {
        log('Upload failed after all retries');
        setError('Erro ao salvar áudio');
        toast.error('Erro ao salvar áudio após ' + maxAttempts + ' tentativas. Tente novamente.');
      }
    } finally {
      cleanupStream();
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  const transcribeAudioWithRetry = async (urlToTranscribe, attempt = 1) => {
    const maxAttempts = 2;
    const url = urlToTranscribe || audioUrl;
    
    if (!url) {
      log('ERROR: No audio URL for transcription');
      return;
    }

    if (!isMountedRef.current) {
      log('Component unmounted - aborting transcription');
      return;
    }

    setIsTranscribing(true);
    log(`Transcription attempt ${attempt}/${maxAttempts}`, { url });

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 60000)
      );

      const transcribePromise = base44.functions.invoke('transcribeAudio', {
        audio_url: url
      });

      const result = await Promise.race([transcribePromise, timeoutPromise]);

      if (!isMountedRef.current) {
        log('Component unmounted after transcription');
        return;
      }

      if (result.data?.text) {
        log('Transcription success', { textLength: result.data.text.length });
        onTranscribed?.(result.data.text);
        toast.success('Áudio transcrito com sucesso!');
      } else {
        throw new Error('Texto vazio retornado');
      }
    } catch (error) {
      log(`Transcription failed (attempt ${attempt})`, error);
      
      if (error.message === 'Timeout') {
        toast.error('Transcrição demorou muito. Tente novamente.');
      } else if (attempt < maxAttempts) {
        log(`Retrying transcription... (${attempt + 1}/${maxAttempts})`);
        toast.info(`Tentando transcrever novamente... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return transcribeAudioWithRetry(url, attempt + 1);
      } else {
        log('Transcription failed after all retries');
        toast.error('Erro ao transcrever após ' + maxAttempts + ' tentativas. Use o botão "Transcrever" novamente.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsTranscribing(false);
      }
    }
  };

  const deleteAudio = () => {
    log('Deleting audio');
    setAudioUrl(null);
    setError(null);
    onAudioSaved?.(null);
    toast.success('Áudio excluído');
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        log('Playback paused');
      } else {
        audioRef.current.play();
        log('Playback started');
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isBusy = isRecording || isUploading || isTranscribing;

  return (
    <div className="space-y-2">
      {/* Timer (durante gravação) */}
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
        {!isRecording && !audioUrl && !isBusy && (
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
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Salvando áudio...</span>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 text-purple-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Transcrevendo (pode levar até 1 minuto)...</span>
          </div>
        )}

        {audioUrl && !isBusy && (
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

            {showManualTranscribe && onTranscribed && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => transcribeAudioWithRetry(audioUrl)}
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

      {/* Status Indicators */}
      {audioUrl && !isBusy && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          Áudio salvo
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* Guia de debug */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-gray-500 mt-2">
          <summary className="cursor-pointer">Debug Info</summary>
          <div className="mt-1 space-y-1 font-mono">
            <div>Recording: {isRecording ? 'YES' : 'NO'}</div>
            <div>Uploading: {isUploading ? 'YES' : 'NO'}</div>
            <div>Transcribing: {isTranscribing ? 'YES' : 'NO'}</div>
            <div>Audio URL: {audioUrl ? 'SET' : 'EMPTY'}</div>
            <div>Mode: {mode}</div>
          </div>
        </details>
      )}
    </div>
  );
}
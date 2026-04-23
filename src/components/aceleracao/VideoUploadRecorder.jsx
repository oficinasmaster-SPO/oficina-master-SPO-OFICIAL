import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Circle, Square, Check, Trash2, Play, AlertCircle, CameraOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const MAX_DURATION_SECONDS = 5 * 60; // 5 minutos
const MAX_FILE_SIZE_MB = 200;

// Detecta o melhor mimeType suportado pelo browser/dispositivo
function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export default function VideoUploadRecorder({ videoUrl, onVideoSaved, onVideoRemoved }) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  // ── Gravação ──
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [previewReady, setPreviewReady] = useState(false);

  const liveVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const elapsedRef = useRef(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
    setPreviewReady(false);
  }, []);

  // Pedir permissão e enumerar dispositivos
  useEffect(() => {
    if (!showRecorder) return;
    setPermissionError(null);

    (async () => {
      try {
        // Primeiro pede permissão genérica para desbloquear labels
        const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        testStream.getTracks().forEach(t => t.stop()); // libera imediatamente

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === "videoinput");
        const microphones = devices.filter(d => d.kind === "audioinput");

        setCameras(cams);
        setMics(microphones);

        // Mobile: preferir câmera frontal; fallback para a primeira disponível
        const frontal = cams.find(c =>
          c.label.toLowerCase().includes("front") ||
          c.label.toLowerCase().includes("frontal") ||
          c.label.toLowerCase().includes("user")
        );
        const defaultCam = frontal?.deviceId || cams[0]?.deviceId || "";
        const defaultMic = microphones[0]?.deviceId || "";

        setSelectedCamera(defaultCam);
        setSelectedMic(defaultMic);
      } catch (err) {
        const msg = err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Permissão de câmera/microfone negada. Verifique as configurações do seu navegador."
          : "Não foi possível acessar câmera ou microfone.";
        setPermissionError(msg);
      }
    })();

    return () => {
      stopStream();
    };
  }, [showRecorder, stopStream]);

  // Iniciar live preview quando câmera/mic estiverem selecionados
  useEffect(() => {
    if (!showRecorder || recording || !selectedCamera) return;
    startLivePreview(selectedCamera, selectedMic);
  }, [selectedCamera, selectedMic, showRecorder]); // eslint-disable-line

  const startLivePreview = async (cameraId, micId) => {
    stopStream();
    if (!cameraId) return;

    try {
      const videoConstraints = {
        // Usar "ideal" em vez de "exact" para compatibilidade com mobile/Safari
        deviceId: cameraId ? { ideal: cameraId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
      const audioConstraints = micId ? { deviceId: { ideal: micId } } : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });

      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {}); // evita erro de autoplay no mobile
      }
      setPreviewReady(true);
    } catch (err) {
      console.error("startLivePreview error:", err);
      const msg = err.name === "NotAllowedError"
        ? "Permissão negada para acessar o dispositivo."
        : `Erro ao acessar ${err.message || "dispositivo"}`;
      toast.error(msg);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    elapsedRef.current = 0;

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    let mr;
    try {
      mr = new MediaRecorder(streamRef.current, options);
    } catch {
      // Fallback sem opções se o browser não aceitar
      mr = new MediaRecorder(streamRef.current);
    }

    mr.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const type = mr.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };

    mediaRecorderRef.current = mr;
    mr.start(200);
    setRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      if (elapsedRef.current >= MAX_DURATION_SECONDS) {
        stopRecordingInternal();
      }
    }, 1000);
  };

  const stopRecordingInternal = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    stopStream(); // Para o stream assim que a gravação termina
  };

  const stopRecording = () => {
    stopRecordingInternal();
  };

  const handleUseVideo = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    try {
      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([recordedBlob], `instrucao_${Date.now()}.${ext}`, { type: recordedBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoSaved(file_url);
      toast.success("Vídeo salvo com sucesso!");
      handleCloseRecorder();
    } catch {
      toast.error("Erro ao enviar vídeo. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDiscard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;
    // Reiniciar preview ao vivo
    startLivePreview(selectedCamera, selectedMic);
  };

  const handleCloseRecorder = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setRecording(false);
    setPermissionError(null);
    setShowRecorder(false);
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tamanho
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoSaved(file_url);
      toast.success("Vídeo enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar vídeo. Tente novamente.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Verifica se MediaRecorder está disponível no browser
  const canRecord = typeof MediaRecorder !== "undefined" && typeof navigator?.mediaDevices?.getUserMedia === "function";

  return (
    <div className="space-y-2">
      {videoUrl ? (
        <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <Video className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="text-sm text-purple-700 font-medium flex-1">Vídeo de instrução</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-purple-600 hover:text-purple-800" onClick={() => setShowPreview(true)}>
            <Play className="w-3 h-3 mr-1" /> Ver
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={onVideoRemoved} title="Remover vídeo">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUploadFile}
              disabled={uploading}
            />
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" disabled={uploading} asChild>
              <span>
                <Upload className="w-3 h-3" />
                {uploading ? "Enviando..." : "Subir vídeo"}
              </span>
            </Button>
          </label>

          {canRecord && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setShowRecorder(true)}
              disabled={uploading}
            >
              <Circle className="w-3 h-3" /> Gravar agora
            </Button>
          )}
        </div>
      )}

      {/* Modal preview do vídeo salvo */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Pré-visualização do vídeo</DialogTitle>
          </DialogHeader>
          <video src={videoUrl} controls playsInline className="w-full rounded-lg max-h-96" />
        </DialogContent>
      </Dialog>

      {/* Modal de gravação */}
      <Dialog open={showRecorder} onOpenChange={open => !open && handleCloseRecorder()}>
        <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col overflow-hidden p-4">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <Circle className="w-4 h-4 text-red-500" />
              Gravar vídeo de instrução
              <span className="text-xs font-normal text-gray-400 ml-auto">máx. 5 min</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pt-2 pb-2">

            {/* Erro de permissão */}
            {permissionError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CameraOff className="w-12 h-12 text-gray-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">Sem acesso à câmera</p>
                  <p className="text-sm text-gray-500 max-w-sm">{permissionError}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-left max-w-sm">
                  <p className="font-semibold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Como liberar:</p>
                  <p>• Chrome/Edge: clique no ícone de câmera na barra de endereço</p>
                  <p>• Safari iOS: Ajustes → Safari → Câmera → Permitir</p>
                  <p>• Firefox: clique no cadeado na barra de endereço</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowRecorder(false)}>Fechar</Button>
              </div>
            ) : recordedUrl ? (
              /* Preview do vídeo gravado */
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Pré-visualização — confira antes de usar:</p>
                <video
                  src={recordedUrl}
                  controls
                  playsInline
                  className="w-full rounded-lg bg-black max-h-64"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUseVideo} disabled={uploading} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4" />
                    {uploading ? "Enviando..." : "Usar este vídeo"}
                  </Button>
                  <Button variant="outline" onClick={handleDiscard} disabled={uploading} className="gap-1">
                    <Trash2 className="w-4 h-4" /> Descartar e regravar
                  </Button>
                </div>
              </div>
            ) : (
              /* Live preview + controles */
              <>
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full rounded-lg max-h-64 object-cover"
                    style={{ transform: "scaleX(-1)" }} /* espelho — natural para selfie */
                  />
                  {!previewReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-xs opacity-60">Aguardando câmera...</div>
                    </div>
                  )}
                  {recording && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      REC
                    </div>
                  )}
                </div>

                {/* Seleção de dispositivos — só quando não está gravando */}
                {!recording && cameras.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Câmera</label>
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar câmera" />
                        </SelectTrigger>
                        <SelectContent>
                          {cameras.map((c, i) => (
                            <SelectItem key={c.deviceId} value={c.deviceId} className="text-xs">
                              {c.label || `Câmera ${i + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Microfone</label>
                      <Select value={selectedMic} onValueChange={setSelectedMic}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar microfone" />
                        </SelectTrigger>
                        <SelectContent>
                          {mics.map((m, i) => (
                            <SelectItem key={m.deviceId} value={m.deviceId} className="text-xs">
                              {m.label || `Microfone ${i + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Timer e controles */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {recording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                    <span className={`text-lg font-mono font-bold ${recording ? "text-red-600" : "text-gray-400"}`}>
                      {formatTime(elapsed)} / {formatTime(MAX_DURATION_SECONDS)}
                    </span>
                  </div>

                  {recording ? (
                    <Button onClick={stopRecording} className="gap-1 bg-red-600 hover:bg-red-700">
                      <Square className="w-4 h-4" /> Parar
                    </Button>
                  ) : (
                    <Button
                      onClick={startRecording}
                      className="gap-1 bg-red-500 hover:bg-red-600"
                      disabled={!selectedCamera || !previewReady}
                    >
                      <Circle className="w-4 h-4" /> Iniciar gravação
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
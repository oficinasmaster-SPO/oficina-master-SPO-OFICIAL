import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Circle, Square, Check, Trash2, Play, AlertCircle, CameraOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const MAX_DURATION_SECONDS = 5 * 60;
const MAX_FILE_SIZE_MB = 200;

function getSupportedMimeType() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || "";
}

const canUseMediaDevices =
  typeof MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

export default function VideoUploadRecorder({ videoUrl, onVideoSaved, onVideoRemoved }) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(false);

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
  // Flag para evitar operações após desmontagem / fechamento
  const mountedRef = useRef(false);

  // ── Helpers de stream ───────────────────────────────────────────────────────

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
    setPreviewReady(false);
  };

  // ── Inicialização do modal ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showRecorder) return;
    mountedRef.current = true;
    setPermissionError(null);
    setLoadingDevices(true);

    (async () => {
      try {
        // Pede permissão para desbloquear labels dos dispositivos
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        tempStream.getTracks().forEach(t => t.stop());

        if (!mountedRef.current) return;

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === "videoinput");
        const mics_ = devices.filter(d => d.kind === "audioinput");

        if (!mountedRef.current) return;

        setCameras(cams);
        setMics(mics_);

        const frontal = cams.find(c =>
          /front|frontal|user/i.test(c.label)
        );
        const defaultCam = frontal?.deviceId || cams[0]?.deviceId || "";
        const defaultMic = mics_[0]?.deviceId || "";

        setSelectedCamera(defaultCam);
        setSelectedMic(defaultMic);
        setLoadingDevices(false);

        // Inicia preview imediatamente após obter os device IDs
        await startLivePreview(defaultCam, defaultMic);
      } catch (err) {
        if (!mountedRef.current) return;
        setLoadingDevices(false);
        const msg =
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Permissão de câmera/microfone negada. Verifique as configurações do seu navegador."
            : err.name === "NotFoundError"
            ? "Câmera ou microfone não encontrado neste dispositivo."
            : "Não foi possível acessar câmera ou microfone.";
        setPermissionError(msg);
      }
    })();

    return () => {
      mountedRef.current = false;
      // Limpeza ao fechar o modal
      clearInterval(timerRef.current);
      stopStream();
    };
  }, [showRecorder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Troca de câmera/mic pelo usuário (não roda na inicialização pois selectedCamera = "" inicial)
  useEffect(() => {
    if (!showRecorder || recording || !selectedCamera) return;
    // Só reage a mudanças após a inicialização (cameras já carregadas)
    if (cameras.length === 0) return;
    startLivePreview(selectedCamera, selectedMic);
  }, [selectedCamera, selectedMic]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview ao vivo ─────────────────────────────────────────────────────────

  const startLivePreview = async (cameraId, micId) => {
    stopStream();
    if (!cameraId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micId ? { deviceId: { ideal: micId } } : true,
      });

      if (!mountedRef.current) {
        // Modal fechou enquanto aguardava
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        try { await liveVideoRef.current.play(); } catch { /* autoplay blocked — ok, muted */ }
      }

      if (mountedRef.current) setPreviewReady(true);
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn("startLivePreview:", err);
      toast.error(
        err.name === "NotAllowedError"
          ? "Permissão negada para a câmera/microfone."
          : "Erro ao abrir câmera. Verifique se outro app está usando-a."
      );
    }
  };

  // ── Gravação ────────────────────────────────────────────────────────────────

  const startRecording = () => {
    if (!streamRef.current) { toast.error("Câmera não está ativa."); return; }

    chunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);

    const mimeType = getSupportedMimeType();
    let mr;
    try {
      mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    } catch {
      mr = new MediaRecorder(streamRef.current);
    }

    mr.ondataavailable = e => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    // onstop é chamado APÓS stop() concluir — aqui os chunks já estão completos
    mr.onstop = () => {
      if (!mountedRef.current) return;
      if (chunksRef.current.length === 0) {
        toast.error("Gravação muito curta ou sem dados. Tente novamente.");
        return;
      }
      const blobType = mr.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: blobType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };

    mediaRecorderRef.current = mr;
    mr.start(500); // chunk a cada 500ms — garante dados mesmo em gravações curtas
    setRecording(true);

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      if (mountedRef.current) setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_DURATION_SECONDS) {
        stopRecording();
      }
    }, 1000);
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;

    // Pede o último chunk antes de parar
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.requestData(); // força flush do buffer atual
      mediaRecorderRef.current.stop();        // dispara onstop assincronamente
    }

    // NÃO para o stream aqui — onstop ainda precisa coletar o último chunk
    // O stream é parado DEPOIS, quando o blob ficar pronto (veja onstop acima → setRecordedBlob)
    setRecording(false);
    // Para o stream da câmera após pequeno delay para garantir flush
    setTimeout(() => {
      if (!mountedRef.current) return;
      stopStream();
    }, 300);
  };

  // ── Ações pós-gravação ──────────────────────────────────────────────────────

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
    // Reinicia o preview ao vivo apenas se ainda montado
    if (mountedRef.current) {
      startLivePreview(selectedCamera, selectedMic);
    }
  };

  const handleCloseRecorder = () => {
    mountedRef.current = false;
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    // Reset de todo o estado
    setCameras([]);
    setMics([]);
    setSelectedCamera("");
    setSelectedMic("");
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setRecording(false);
    setPermissionError(null);
    setPreviewReady(false);
    setLoadingDevices(false);
    setShowRecorder(false);
  };

  // ── Upload de arquivo ───────────────────────────────────────────────────────

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Render ──────────────────────────────────────────────────────────────────

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
            <input type="file" accept="video/*" className="hidden" onChange={handleUploadFile} disabled={uploading} />
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" disabled={uploading} asChild>
              <span><Upload className="w-3 h-3" /> {uploading ? "Enviando..." : "Subir vídeo"}</span>
            </Button>
          </label>
          {canUseMediaDevices && (
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

      {/* Preview do vídeo salvo */}
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

            {/* ── Erro de permissão ── */}
            {permissionError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CameraOff className="w-12 h-12 text-gray-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">Sem acesso à câmera</p>
                  <p className="text-sm text-gray-500 max-w-sm">{permissionError}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-left max-w-sm space-y-0.5">
                  <p className="font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Como liberar:</p>
                  <p>• Chrome/Edge: ícone de câmera na barra de endereço</p>
                  <p>• Safari iOS: Ajustes → Safari → Câmera → Permitir</p>
                  <p>• Firefox: cadeado na barra de endereço</p>
                  <p>• Android: Configurações → Apps → Navegador → Permissões</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCloseRecorder}>Fechar</Button>
              </div>

            ) : loadingDevices ? (
              /* ── Carregando dispositivos ── */
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Acessando câmera e microfone...</p>
              </div>

            ) : recordedUrl ? (
              /* ── Preview do vídeo gravado ── */
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Pré-visualização — confira antes de usar:</p>
                <video src={recordedUrl} controls playsInline className="w-full rounded-lg bg-black max-h-64" />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleUseVideo} disabled={uploading} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4" />
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : "Usar este vídeo"}
                  </Button>
                  <Button variant="outline" onClick={handleDiscard} disabled={uploading} className="gap-1">
                    <Trash2 className="w-4 h-4" /> Descartar e regravar
                  </Button>
                </div>
              </div>

            ) : (
              /* ── Live preview + controles ── */
              <>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: 200 }}>
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full rounded-lg max-h-64 object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {!previewReady && !permissionError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                        <span className="text-white text-xs">Iniciando câmera...</span>
                      </div>
                    </div>
                  )}
                  {recording && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      REC {formatTime(elapsed)}
                    </div>
                  )}
                </div>

                {/* Seleção de dispositivos */}
                {!recording && cameras.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Câmera</label>
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Câmera" />
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
                          <SelectValue placeholder="Microfone" />
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
                      <Square className="w-4 h-4" /> Parar e revisar
                    </Button>
                  ) : (
                    <Button
                      onClick={startRecording}
                      className="gap-1 bg-red-500 hover:bg-red-600"
                      disabled={!previewReady}
                      title={!previewReady ? "Aguardando câmera ficar pronta" : ""}
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
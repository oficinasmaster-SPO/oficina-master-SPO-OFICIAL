import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Circle, Square, Check, Trash2, Play, Pause } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const MAX_DURATION_SECONDS = 5 * 60; // 5 minutos

export default function VideoUploadRecorder({ videoUrl, onVideoSaved, onVideoRemoved }) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Gravação ──
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);

  const liveVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Enumerar dispositivos ao abrir recorder
  useEffect(() => {
    if (!showRecorder) return;
    (async () => {
      try {
        // pedir permissão primeiro
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === "videoinput");
        const microphones = devices.filter(d => d.kind === "audioinput");
        setCameras(cams);
        setMics(microphones);
        // frontal por padrão no mobile (environment = traseira, user = frontal)
        const frontal = cams.find(c => c.label.toLowerCase().includes("front") || c.label.toLowerCase().includes("frontal"));
        setSelectedCamera(frontal?.deviceId || cams[0]?.deviceId || "");
        setSelectedMic(microphones[0]?.deviceId || "");
      } catch {
        toast.error("Não foi possível acessar câmera/microfone");
      }
    })();
    return () => stopStream();
  }, [showRecorder]);

  // Atualizar preview ao vivo quando troca câmera/mic
  useEffect(() => {
    if (!showRecorder || recording) return;
    startLivePreview();
  }, [selectedCamera, selectedMic, showRecorder]);

  const startLivePreview = async () => {
    stopStream();
    if (!selectedCamera) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedCamera } },
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Erro ao acessar dispositivo");
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8,opus" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };
    mediaRecorderRef.current = mr;
    mr.start(200);
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= MAX_DURATION_SECONDS) {
          stopRecording();
          return prev + 1;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleUseVideo = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    try {
      const file = new File([recordedBlob], `instrucao_${Date.now()}.webm`, { type: "video/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoSaved(file_url);
      toast.success("Vídeo salvo com sucesso!");
      handleCloseRecorder();
    } catch {
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  };

  const handleDiscard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
  };

  const handleCloseRecorder = () => {
    stopRecording();
    stopStream();
    handleDiscard();
    setShowRecorder(false);
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoSaved(file_url);
      toast.success("Vídeo enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="video/*" className="hidden" onChange={handleUploadFile} disabled={uploading} />
            <Button type="button" variant="outline" size="sm" className="text-xs gap-1" disabled={uploading} asChild>
              <span><Upload className="w-3 h-3" /> {uploading ? "Enviando..." : "Subir vídeo"}</span>
            </Button>
          </label>
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowRecorder(true)} disabled={uploading}>
            <Circle className="w-3 h-3" /> Gravar agora
          </Button>
        </div>
      )}

      {/* Modal preview do vídeo salvo */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Pré-visualização do vídeo</DialogTitle>
          </DialogHeader>
          <video src={videoUrl} controls className="w-full rounded-lg max-h-96" />
        </DialogContent>
      </Dialog>

      {/* Modal de gravação */}
      <Dialog open={showRecorder} onOpenChange={open => !open && handleCloseRecorder()}>
        <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <Circle className="w-4 h-4 text-red-500" />
              Gravar vídeo de instrução
              <span className="text-xs font-normal text-gray-400 ml-auto">máx. 5 min</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pb-2">
            {/* Preview ou vídeo gravado */}
            {recordedUrl ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Pré-visualização — confira antes de usar:</p>
                <video
                  ref={previewVideoRef}
                  src={recordedUrl}
                  controls
                  className="w-full rounded-lg bg-black max-h-64"
                />
                <div className="flex gap-2">
                  <Button onClick={handleUseVideo} disabled={uploading} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4" /> {uploading ? "Enviando..." : "Usar este vídeo"}
                  </Button>
                  <Button variant="outline" onClick={handleDiscard} disabled={uploading} className="gap-1">
                    <Trash2 className="w-4 h-4" /> Descartar e regravar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={liveVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-lg bg-black max-h-64 object-cover"
                />

                {/* Seleção de dispositivos */}
                {!recording && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Câmera</label>
                      <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar câmera" />
                        </SelectTrigger>
                        <SelectContent>
                          {cameras.map(c => (
                            <SelectItem key={c.deviceId} value={c.deviceId} className="text-xs">
                              {c.label || `Câmera ${cameras.indexOf(c) + 1}`}
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
                          {mics.map(m => (
                            <SelectItem key={m.deviceId} value={m.deviceId} className="text-xs">
                              {m.label || `Microfone ${mics.indexOf(m) + 1}`}
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
                    <Button onClick={startRecording} className="gap-1 bg-red-500 hover:bg-red-600" disabled={!selectedCamera}>
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
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";

/**
 * Botão play pequeno que abre modal com player de vídeo.
 * Usado no SprintTaskItem para o cliente assistir.
 */
export default function VideoPlayerButton({ videoUrl, taskDescription }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef(null);

  if (!videoUrl) return null;

  const handleOpenChange = (isOpen) => {
    if (!isOpen && videoRef.current) {
      // Pausar e liberar recursos ao fechar
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setOpen(isOpen);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
        onClick={() => setOpen(true)}
        title="Assistir vídeo de instrução"
        type="button"
      >
        <Play className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-gray-900 leading-snug">
              🎬 Vídeo de instrução
            </DialogTitle>
            {taskDescription && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{taskDescription}</p>
            )}
          </DialogHeader>
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            className="w-full rounded-lg bg-black max-h-96 mt-2"
            preload="metadata"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
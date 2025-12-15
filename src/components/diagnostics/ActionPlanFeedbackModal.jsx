import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function ActionPlanFeedbackModal({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading 
}) {
  const [feedbackType, setFeedbackType] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const handleSubmit = () => {
    if (feedbackType === "text" && !textContent.trim()) {
      return;
    }
    if (feedbackType === "audio" && !audioUrl) {
      return;
    }

    onSubmit({
      type: feedbackType,
      content: feedbackType === "text" ? textContent : "",
      audio_url: feedbackType === "audio" ? audioUrl : ""
    });
  };

  const handleClear = () => {
    setTextContent("");
    setAudioUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Refinar Plano de Ação com IA
          </DialogTitle>
          <DialogDescription>
            Dê seu feedback sobre o plano para que a IA possa refiná-lo e torná-lo mais específico para sua situação.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={feedbackType} onValueChange={setFeedbackType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Texto</TabsTrigger>
            <TabsTrigger value="audio">Áudio</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Ex: Gostaria de focar mais em vendas e menos em processos. Preciso de ações mais práticas para implementar no dia a dia..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className="border rounded-lg p-6 bg-gray-50">
              <AudioRecorder
                onRecordingComplete={(url) => setAudioUrl(url)}
                audioUrl={audioUrl}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              handleClear();
              onClose();
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (feedbackType === "text" && !textContent.trim()) ||
              (feedbackType === "audio" && !audioUrl)
            }
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refinando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Refinar Plano
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
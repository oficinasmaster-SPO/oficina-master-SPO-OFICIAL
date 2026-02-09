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
import AudioCaptureField from "@/components/shared/AudioCaptureField";

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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Perguntas para te guiar:</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>O que você gostaria de priorizar ou mudar no plano atual?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Quais ações parecem mais difíceis de implementar e por quê?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Há alguma área específica que precisa de mais atenção?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Existem limitações de recursos (tempo, equipe, dinheiro) que devemos considerar?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>O que você já tentou antes e não funcionou?</span>
            </li>
          </ul>
        </div>

        <Tabs value={feedbackType} onValueChange={setFeedbackType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Texto</TabsTrigger>
            <TabsTrigger value="audio">Áudio</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Ex: Preciso priorizar ações de curto prazo porque tenho pouco tempo. Gostaria de focar mais em aumentar vendas do que em processos internos. Também não tenho orçamento para contratar agora..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className="border rounded-lg p-6 bg-gray-50">
              <AudioCaptureField
                existingAudioUrl={audioUrl}
                onAudioSaved={(url) => setAudioUrl(url)}
                mode="simple"
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
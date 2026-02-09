import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Mic, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import AudioRecorder from "@/components/audio/AudioRecorder";

export default function FeedbackPlanoModal({ open, onClose, onSubmit, isLoading }) {
  const [feedbackType, setFeedbackType] = useState("text");
  const [textFeedback, setTextFeedback] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  const handleSubmit = async () => {
    if (feedbackType === "text" && !textFeedback.trim()) {
      toast.error("Por favor, escreva seu feedback");
      return;
    }

    if (feedbackType === "audio" && !audioUrl) {
      toast.error("Por favor, grave seu feedback em áudio");
      return;
    }

    const feedbackData = {
      type: feedbackType,
      content: feedbackType === "text" ? textFeedback : "Áudio gravado",
      audio_url: audioUrl
    };

    await onSubmit(feedbackData);
    
    // Limpar formulário
    setTextFeedback("");
    setAudioUrl(null);
  };

  const handleAudioRecorded = (url) => {
    setAudioUrl(url);
    toast.success("Áudio gravado com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Aprimorar Plano com Seu Feedback</DialogTitle>
          <p className="text-gray-600 mt-2">
            Compartilhe suas observações, limitações ou ajustes desejados. 
            A IA irá refinar o plano com base no seu feedback.
          </p>
        </DialogHeader>

        <Tabs value={feedbackType} onValueChange={setFeedbackType} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback por Texto
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Mic className="w-4 h-4" />
              Feedback por Áudio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Descreva seus ajustes desejados:
              </label>
              <Textarea
                value={textFeedback}
                onChange={(e) => setTextFeedback(e.target.value)}
                placeholder="Ex: Tenho apenas 2 funcionários, não consigo fazer tudo que está no plano. Preciso de ações mais simples e focadas em vendas..."
                rows={8}
                className="w-full"
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Dica:</strong> Seja específico sobre:
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Recursos limitados (tempo, pessoas, dinheiro)</li>
                <li>Áreas que precisam de mais foco</li>
                <li>Ações que não fazem sentido para sua realidade</li>
                <li>Objetivos mais realistas</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Grave seu feedback:
              </label>
              <AudioRecorder onRecordingComplete={handleAudioRecorded} />
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                <strong>Vantagem do áudio:</strong> Fale naturalmente sobre sua rotina, 
                desafios e limitações. A IA irá transcrever e analisar seu feedback para 
                criar um plano ainda mais personalizado.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refinando Plano...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Refinar Plano com IA
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
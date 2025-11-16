import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, PlayCircle, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function HelpButton({ title, description, videoUrl, faqs, fullVideoUrl }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed top-24 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white shadow-2xl rounded-full w-14 h-14 border-4 border-white"
        title="Precisa de Ajuda?"
      >
        <HelpCircle className="w-7 h-7" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-blue-600" />
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Descrição */}
            {description && (
              <div className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-200">
                {description}
              </div>
            )}

            {/* Vídeo Embed */}
            {videoUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <PlayCircle className="w-5 h-5 text-blue-600" />
                  Vídeo Explicativo
                </div>
                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                  <iframe
                    src={videoUrl}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <PlayCircle className="w-5 h-5 text-gray-400" />
                  Vídeo Explicativo
                </div>
                <div className="relative w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500 p-6">
                    <PlayCircle className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium text-lg">Vídeo será disponibilizado em breve</p>
                    <p className="text-sm mt-1">Por enquanto, use o FAQ abaixo</p>
                  </div>
                </div>
              </div>
            )}

            {/* FAQ */}
            {faqs && faqs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  Perguntas Frequentes
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:text-blue-600">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Link para vídeo completo */}
            {fullVideoUrl && (
              <div className="pt-4 border-t">
                <a
                  href={fullVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Assistir vídeo completo no YouTube
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TemplateBacklogSelector({ isOpen, onClose, onSelect, workshopId }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ['template-backlog', workshopId],
    queryFn: async () => {
      const allTemplates = await base44.entities.TemplateBacklog.filter({
        ativo: true
      });
      
      // Filtrar: templates gerais OU específicos do workshop
      return allTemplates.filter(t => !t.workshop_id || t.workshop_id === workshopId);
    },
    enabled: isOpen
  });

  const filtered = templates.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (template) => {
    onSelect({
      titulo: template.titulo,
      descricao: template.descricao,
      prioridade: template.prioridade,
      impacto: template.impacto
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Template de Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por título, categoria ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Zap className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum template encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{template.titulo}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{template.descricao}</p>
                        <div className="flex gap-2 mt-2">
                          {template.categoria && (
                            <Badge variant="outline">{template.categoria}</Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-700">{template.prioridade}</Badge>
                          {template.impacto && (
                            <Badge className="bg-purple-100 text-purple-700">{template.impacto}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
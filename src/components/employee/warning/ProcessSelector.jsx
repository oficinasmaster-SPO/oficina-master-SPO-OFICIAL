import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessSelector({ workshopId, onSelect, selectedProcessId }) {
  const [selectedIT, setSelectedIT] = useState("");

  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ['processes', workshopId],
    queryFn: async () => {
      const result = await base44.entities.ProcessDocument.filter({ workshop_id: workshopId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId
  });

  const { data: instructions = [], isLoading: loadingITs } = useQuery({
    queryKey: ['instructions', selectedProcessId],
    queryFn: async () => {
      if (!selectedProcessId) return [];
      const result = await base44.entities.InstructionDocument.filter({ process_id: selectedProcessId });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!selectedProcessId
  });

  const handleProcessChange = (processId) => {
    const process = processes.find(p => p.id === processId);
    onSelect({ 
      process_id: processId, 
      process_name: process?.name,
      it_document_id: null,
      it_name: null 
    });
    setSelectedIT("");
  };

  const handleITChange = (itId) => {
    const it = instructions.find(i => i.id === itId);
    setSelectedIT(itId);
    onSelect({ 
      process_id: selectedProcessId, 
      it_document_id: itId,
      it_name: it?.title 
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Processo (MAP) Relacionado
        </Label>
        {loadingProcesses ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando processos...
          </div>
        ) : processes.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">Nenhum processo cadastrado</p>
        ) : (
          <Select value={selectedProcessId || ""} onValueChange={handleProcessChange}>
            <SelectTrigger className="mt-1 bg-white">
              <SelectValue placeholder="Selecione o processo descumprido" />
            </SelectTrigger>
            <SelectContent>
              {processes.map(proc => (
                <SelectItem key={proc.id} value={proc.id}>
                  {proc.name} - {proc.area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedProcessId && (
        <div>
          <Label>Instrução de Trabalho (IT) Específica</Label>
          {loadingITs ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando ITs...
            </div>
          ) : instructions.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">Nenhuma IT cadastrada para este processo</p>
          ) : (
            <Select value={selectedIT} onValueChange={handleITChange}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue placeholder="Opcional: IT específica" />
              </SelectTrigger>
              <SelectContent>
                {instructions.map(it => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
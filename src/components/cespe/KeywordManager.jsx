import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_KEYWORDS = ['trabalhar', 'vaga', 'emprego', 'contratar', 'currículo', 'oportunidade'];

export default function KeywordManager({ workshopId }) {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`keywords_${workshopId}`);
    if (saved) {
      setKeywords(JSON.parse(saved));
    }
  }, [workshopId]);

  const saveKeywords = (updatedKeywords) => {
    localStorage.setItem(`keywords_${workshopId}`, JSON.stringify(updatedKeywords));
    setKeywords(updatedKeywords);
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed) return;

    if (keywords.includes(trimmed)) {
      toast.error("Palavra-chave já existe");
      return;
    }

    const updated = [...keywords, trimmed];
    saveKeywords(updated);
    setNewKeyword("");
    setShowInput(false);
    toast.success("Palavra-chave adicionada!");
  };

  const removeKeyword = (keyword) => {
    const updated = keywords.filter(k => k !== keyword);
    saveKeywords(updated);
    toast.success("Palavra-chave removida");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Palavras-chave capturadas:</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowInput(!showInput)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Digite a palavra ou frase..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            autoFocus
          />
          <Button size="sm" onClick={addKeyword}>
            Adicionar
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {keywords.map(kw => (
          <Badge
            key={kw}
            variant="secondary"
            className="bg-gray-200 text-gray-800 pr-1"
          >
            {kw}
            <button
              onClick={() => removeKeyword(kw)}
              className="ml-1.5 hover:bg-gray-300 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
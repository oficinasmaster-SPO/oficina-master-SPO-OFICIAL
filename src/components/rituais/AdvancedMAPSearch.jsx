import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdvancedMAPSearch({ workshop, onViewMAP }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [maps, setMaps] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (workshop?.id) {
      loadMaps();
    }
  }, [workshop?.id]);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, maps]);

  const loadMaps = async () => {
    try {
      const mapsData = await base44.entities.ProcessDocument.filter({
        workshop_id: workshop.id,
        category: "Ritual"
      });
      setMaps(mapsData);
    } catch (error) {
      console.error("Erro ao carregar MAPs:", error);
    }
  };

  const performSearch = () => {
    setSearching(true);
    const term = searchTerm.toLowerCase();

    const results = maps.filter(map => {
      // Busca no título e descrição
      if (map.title?.toLowerCase().includes(term) || 
          map.description?.toLowerCase().includes(term)) {
        return true;
      }

      // Busca no content_json
      if (map.content_json) {
        const contentStr = JSON.stringify(map.content_json).toLowerCase();
        if (contentStr.includes(term)) {
          return true;
        }
      }

      return false;
    });

    setSearchResults(results);
    setSearching(false);
  };

  const highlightMatch = (text, term) => {
    if (!text) return "";
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar em títulos, descrições e conteúdo dos MAPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-xs text-gray-500 text-center">
              Digite ao menos 3 caracteres para buscar
            </p>
          )}

          {searchTerm.length >= 3 && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum resultado encontrado
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {searchResults.length} resultado(s) encontrado(s)
              </p>
              {searchResults.map(map => (
                <Card key={map.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <h4 
                            className="font-semibold text-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightMatch(map.title, searchTerm) 
                            }}
                          />
                        </div>
                        <p 
                          className="text-xs text-gray-600 line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatch(map.description, searchTerm) 
                          }}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {map.code}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            {map.operational_status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onViewMAP && onViewMAP(map)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
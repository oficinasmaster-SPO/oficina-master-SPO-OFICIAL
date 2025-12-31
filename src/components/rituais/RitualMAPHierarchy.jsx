import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, FileText, Calendar, User, Eye } from "lucide-react";
import { toast } from "sonner";

export default function RitualMAPHierarchy({ workshop, onViewMAP }) {
  const [ritualsWithMaps, setRitualsWithMaps] = useState([]);
  const [expandedRituals, setExpandedRituals] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workshop?.id) {
      loadHierarchy();
    }
  }, [workshop?.id]);

  const loadHierarchy = async () => {
    try {
      const [rituals, maps] = await Promise.all([
        base44.entities.Ritual.filter({ workshop_id: workshop.id }),
        base44.entities.ProcessDocument.filter({ 
          workshop_id: workshop.id,
          category: "Ritual" 
        })
      ]);

      const ritualsWithMapsData = rituals.map(ritual => {
        const linkedMap = maps.find(m => m.id === ritual.process_document_id);
        return { ...ritual, map: linkedMap };
      });

      setRitualsWithMaps(ritualsWithMapsData);
    } catch (error) {
      console.error("Erro ao carregar hierarquia:", error);
      toast.error("Erro ao carregar hierarquia de rituais");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (ritualId) => {
    const newExpanded = new Set(expandedRituals);
    if (newExpanded.has(ritualId)) {
      newExpanded.delete(ritualId);
    } else {
      newExpanded.add(ritualId);
    }
    setExpandedRituals(newExpanded);
  };

  const pillarLabels = {
    proposito: "Propósito",
    missao: "Missão",
    visao: "Visão",
    valores: "Valores",
    rituais_cultura: "Rituais de Cultura",
    lideranca: "Liderança",
    foco_cliente: "Foco no Cliente",
    performance_responsabilidade: "Performance",
    desenvolvimento_continuo: "Desenvolvimento"
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando hierarquia...
        </CardContent>
      </Card>
    );
  }

  if (ritualsWithMaps.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Nenhum ritual personalizado criado ainda
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Hierarquia de Rituais e MAPs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          {ritualsWithMaps.map((ritual) => {
            const isExpanded = expandedRituals.has(ritual.id);
            const hasMap = !!ritual.map;

            return (
              <div key={ritual.id} className="border rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  onClick={() => toggleExpand(ritual.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {hasMap ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{ritual.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {pillarLabels[ritual.pillar] || ritual.pillar}
                        </Badge>
                        {hasMap && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            MAP Vinculado
                          </Badge>
                        )}
                        {!hasMap && (
                          <Badge variant="secondary" className="text-xs">
                            Sem MAP
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && hasMap && (
                  <div className="p-4 bg-white border-t">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-purple-600 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm text-gray-900">
                          {ritual.map.title}
                        </h5>
                        <p className="text-xs text-gray-600 mt-1">
                          {ritual.map.description}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                          <span>Código: {ritual.map.code}</span>
                          <span>Rev: {ritual.map.revision}</span>
                          <Badge variant="outline">
                            {ritual.map.operational_status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onViewMAP && onViewMAP(ritual.map)}
                          className="mt-3"
                        >
                          <Eye className="w-3 h-3 mr-2" />
                          Visualizar MAP
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
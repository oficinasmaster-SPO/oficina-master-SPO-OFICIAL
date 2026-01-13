import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Trash2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import ClientIntelligenceChecklistManager from "@/components/inteligencia/ClientIntelligenceChecklistManager";
import { INTELLIGENCE_TYPES, INTELLIGENCE_AREAS } from "@/components/lib/clientIntelligenceConstants";

export default function MapaChecklists() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedType, setSelectedType] = useState("dor");
  const [selectedArea, setSelectedArea] = useState("");
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const workshops = await base44.entities.Workshop.filter({
          owner_id: currentUser.id,
        });
        if (workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();
  }, []);

  const { data: checklists = [] } = useQuery({
    queryKey: ["checklists", workshop?.id, selectedType, selectedArea],
    queryFn: async () => {
      if (!workshop?.id) return [];
      
      // Buscar checklists da oficina atual
      const query = {
        workshop_id: workshop.id,
        type: selectedType,
      };
      if (selectedArea) {
        query.area = selectedArea;
      }
      const workshopChecklists = await base44.entities.ClientIntelligenceChecklist.filter(query);
      
      // Buscar checklists padrões do sistema
      const defaultQuery = {
        is_default: true,
        type: selectedType,
      };
      if (selectedArea) {
        defaultQuery.area = selectedArea;
      }
      const defaultChecklists = await base44.entities.ClientIntelligenceChecklist.filter(defaultQuery);
      
      // Combinar e ordenar (oficina primeiro, depois padrões)
      const combined = [
        ...(Array.isArray(workshopChecklists) ? workshopChecklists : []),
        ...(Array.isArray(defaultChecklists) ? defaultChecklists : [])
      ];
      
      return combined;
    },
    enabled: !!workshop?.id,
  });

  const handleDelete = async (checklistId) => {
    if (window.confirm("Tem certeza que deseja deletar este checklist?")) {
      try {
        await base44.entities.ClientIntelligenceChecklist.delete(checklistId);
        toast.success("Checklist deletado");
      } catch (error) {
        toast.error("Erro ao deletar checklist");
        console.error(error);
      }
    }
  };

  const typeConfig = INTELLIGENCE_TYPES[selectedType] || {};
  const typeLabel = typeConfig.label || selectedType;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mapa de Checklists</h1>
        <p className="text-gray-600 mt-2">
          Gerencie checklists para cada tipo de inteligência do cliente
        </p>
      </div>

      <div className="mb-6">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Filtrar por Área (opcional)
        </label>
        <div className="flex gap-2">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Todas as áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas as áreas</SelectItem>
              {Object.entries(INTELLIGENCE_AREAS).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedArea && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedArea("")}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          {Object.entries(INTELLIGENCE_TYPES).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
              <span className="hidden sm:inline">{config.label}</span>
              <span className="sm:hidden">{config.label.split('(')[0].trim()}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(INTELLIGENCE_TYPES).map(([typeKey, typeConfig]) => (
          <TabsContent key={typeKey} value={typeKey} className="space-y-6">
            <div className="flex items-center justify-between">
               <div>
                   <h2 className="text-2xl font-bold text-gray-900">
                     {typeConfig.label}
                   </h2>
                   <p className="text-sm text-gray-600">{typeConfig.description}</p>
               </div>
              <Button
                onClick={() => {
                  setEditingChecklist(null);
                  setManagerOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Checklist
              </Button>
            </div>

            {checklists.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  Nenhum checklist para {typeConfig.label.toLowerCase()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Crie um novo checklist para organizar os itens
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Título</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-700">Área</th>
                      <th className="text-center p-4 text-sm font-semibold text-gray-700">Itens</th>
                      <th className="text-center p-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-center p-4 text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklists.map((checklist) => (
                      <tr
                        key={checklist.id}
                        onClick={() => {
                          setEditingChecklist(checklist);
                          setManagerOpen(true);
                        }}
                        className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-gray-900">{checklist.title}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{checklist.description}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {INTELLIGENCE_AREAS[checklist.area]?.label || checklist.area}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                            {checklist.items?.length || 0}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge
                              variant={checklist.status === "ativo" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {checklist.status === "ativo" ? "Ativo" : "Inativo"}
                            </Badge>
                            {checklist.is_default && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                                Padrão
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChecklist(checklist);
                                setManagerOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(checklist.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ClientIntelligenceChecklistManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        workshopId={workshop?.id}
        type={selectedType}
        area={selectedArea}
        initialData={editingChecklist}
        onChecklistCreated={() => {
          setManagerOpen(false);
          setEditingChecklist(null);
        }}
      />
    </div>
  );
}
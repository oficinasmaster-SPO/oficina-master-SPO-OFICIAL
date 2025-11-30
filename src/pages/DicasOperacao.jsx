import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Lightbulb, Info } from "lucide-react";
import { toast } from "sonner";
import DynamicHelpSystem from "@/components/help/DynamicHelpSystem";

export default function DicasOperacao() {
  const queryClient = useQueryClient();
  const [tips, setTips] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Carregar usuário e oficina
  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const workshops = await base44.entities.Workshop.list();
        let userWorkshop = workshops.find(w => w.owner_id === user.id);
        
        if (!userWorkshop) {
          // Tentar encontrar como colaborador
          const employees = await base44.entities.Employee.filter({ email: user.email });
          if (employees.length > 0 && employees[0].workshop_id) {
            userWorkshop = workshops.find(w => w.id === employees[0].workshop_id);
          }
        }
        
        if (userWorkshop) {
          setWorkshop(userWorkshop);
          setTips(userWorkshop.quick_tips || "");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!workshop) {
      toast.error("Nenhuma oficina encontrada vinculada ao seu usuário");
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.Workshop.update(workshop.id, {
        quick_tips: tips
      });
      
      // Atualizar cache local
      setWorkshop(prev => ({ ...prev, quick_tips: tips }));
      
      // Invalidar queries que podem usar esses dados
      queryClient.invalidateQueries(['workshops']);
      
      toast.success("Dicas operacionais atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dicas:", error);
      toast.error("Erro ao salvar as dicas");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop && currentUser) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-yellow-50 p-6 rounded-full mb-4">
          <Info className="w-12 h-12 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Oficina não encontrada</h2>
        <p className="text-gray-600 max-w-md">
          Você precisa estar vinculado a uma oficina para gerenciar as dicas operacionais.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <DynamicHelpSystem pageName="DicasOperacao" />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-500" />
              Dicas da Operação
            </h1>
            <p className="text-gray-600 mt-1">
              Defina as mensagens e dicas rápidas que aparecerão na tela inicial para toda a equipe
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Dicas
          </Button>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="bg-white border-b">
            <CardTitle>Mural de Avisos e Dicas</CardTitle>
            <CardDescription>
              Este texto será exibido com destaque na Dashboard de todos os colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sugestões de uso:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Avisos sobre feriados ou horários especiais</li>
                  <li>Metas da semana ou do mês</li>
                  <li>Lembretes sobre procedimentos de segurança</li>
                  <li>Mensagens motivacionais para a equipe</li>
                </ul>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo das Dicas
            </label>
            <Textarea
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              placeholder="Digite aqui as dicas, avisos ou mensagens importantes para sua equipe..."
              className="min-h-[200px] text-base leading-relaxed p-4"
            />
            
            <div className="mt-4 flex justify-end">
              <p className="text-xs text-gray-500">
                {tips.length} caracteres
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pré-visualização</h3>
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-500 shadow-sm">
            <CardContent className="p-4 flex gap-3">
              <Lightbulb className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-indigo-900 text-lg mb-1">Dicas Rápidas</h3>
                <p className="text-indigo-800 whitespace-pre-line">
                  {tips || "Nenhuma dica configurada no momento."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
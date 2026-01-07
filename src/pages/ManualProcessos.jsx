import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, Download, Eye, Loader2, AlertCircle, Building2 } from "lucide-react";
import ManualViewer from "@/components/manual/ManualViewer";

export default function ManualProcessos() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [incluirProcessosOficiais, setIncluirProcessosOficiais] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops && workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: manualData, isLoading, refetch } = useQuery({
    queryKey: ['manual-data', workshop?.id, incluirProcessosOficiais],
    queryFn: async () => {
      if (!workshop?.id) return null;

      // Buscar processos baseado na escolha do usuário
      const processosFilter = incluirProcessosOficiais 
        ? { 
            $or: [
              { workshop_id: workshop.id },
              { is_template: true, is_official: true }
            ]
          }
        : { workshop_id: workshop.id };

      const itsFilter = incluirProcessosOficiais
        ? {
            $or: [
              { workshop_id: workshop.id },
              { is_official: true }
            ]
          }
        : { workshop_id: workshop.id };

      const [
        cultura,
        processos,
        instructionDocs,
        cargos,
        areas
      ] = await Promise.all([
        base44.entities.MissionVisionValues.filter({ workshop_id: workshop.id }),
        base44.entities.ProcessDocument.filter(processosFilter),
        base44.entities.InstructionDocument.filter(itsFilter),
        base44.entities.JobDescription.filter({ workshop_id: workshop.id }),
        base44.entities.ProcessArea.list()
      ]);

      return {
        cultura: cultura && cultura.length > 0 ? cultura[0] : null,
        processos: processos || [],
        instructionDocs: instructionDocs || [],
        cargos: cargos || [],
        areas: areas || [],
        workshop
      };
    },
    enabled: !!workshop?.id
  });

  const handleGenerateManual = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setShowViewer(true);
    }, 1500);
  };

  if (!user || !workshop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showViewer && manualData) {
    return (
      <ManualViewer 
        data={manualData} 
        onClose={() => setShowViewer(false)} 
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual de Processos e Procedimentos</h1>
          <p className="text-gray-600 mt-2">Documentação completa da sua empresa</p>
        </div>
      </div>

      <Card className="p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-blue-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Manual Completo da Empresa
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Este manual reúne automaticamente todos os processos, procedimentos, cultura organizacional, 
              descrições de cargo e indicadores da sua empresa em um documento estruturado e profissional.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando dados...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {manualData?.processos?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Processos (MAPs)</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">
                  {manualData?.instructionDocs?.length || 0}
                </p>
                <p className="text-sm text-gray-600">ITs e FRs</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {manualData?.cargos?.length || 0}
                </p>
                <p className="text-sm text-gray-600">Descrições de Cargo</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">
                  {manualData?.areas?.filter(a => a.category === 'geral').length || 0}
                </p>
                <p className="text-sm text-gray-600">Áreas Gerais</p>
              </div>
            </div>
          )}

          {!isLoading && !manualData?.cultura && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3 w-full">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-semibold text-yellow-900">Informação de Cultura não encontrada</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Configure Missão, Visão e Valores em <strong>Cultura → Missão, Visão e Valores</strong> 
                  para incluir no manual.
                </p>
              </div>
            </div>
          )}

          {/* Configuração de Inclusão */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <Label htmlFor="incluir-oficiais" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    Incluir Processos Oficiais da Oficinas Master
                  </Label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Adiciona processos padrão da consultoria ao manual
                  </p>
                </div>
              </div>
              <Switch
                id="incluir-oficiais"
                checked={incluirProcessosOficiais}
                onCheckedChange={setIncluirProcessosOficiais}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleGenerateManual}
              disabled={generating || isLoading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando Manual...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 mr-2" />
                  Visualizar Manual Completo
                </>
              )}
            </Button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg w-full mt-6">
            <p className="text-xs text-gray-600 text-left">
              <strong>O manual inclui:</strong> Apresentação institucional, estrutura organizacional, 
              processos por área, funções e cargos, padrões operacionais, indicadores e metas, 
              regras gerais, integração de colaboradores e controle de versão.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
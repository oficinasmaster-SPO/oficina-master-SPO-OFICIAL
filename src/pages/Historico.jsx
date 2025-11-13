import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, TrendingUp, Users, BarChart3, Rocket, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Historico() {
  const navigate = useNavigate();
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  const { data: diagnostics, isLoading } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: () => base44.entities.Diagnostic.list('-created_date'),
    initialData: []
  });

  const getPhaseInfo = (phase) => {
    const phases = {
      1: { title: "Sobrevivência", icon: TrendingUp, color: "bg-red-100 text-red-700" },
      2: { title: "Crescimento", icon: Users, color: "bg-yellow-100 text-yellow-700" },
      3: { title: "Organização", icon: BarChart3, color: "bg-blue-100 text-blue-700" },
      4: { title: "Consolidação", icon: Rocket, color: "bg-green-100 text-green-700" }
    };
    return phases[phase] || phases[1];
  };

  const filterDiagnostics = () => {
    let filtered = [...diagnostics];

    if (filterPhase !== "all") {
      filtered = filtered.filter(d => d.phase === parseInt(filterPhase));
    }

    if (filterPeriod !== "all") {
      const now = new Date();
      const daysAgo = {
        "30": 30,
        "90": 90,
        "365": 365
      }[filterPeriod];

      if (daysAgo) {
        const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
        filtered = filtered.filter(d => new Date(d.created_date) >= cutoffDate);
      }
    }

    return filtered;
  };

  const filteredDiagnostics = filterDiagnostics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Histórico de Diagnósticos
          </h1>
          <p className="text-gray-600">
            Acompanhe a evolução da sua oficina ao longo do tempo
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrar por Fase
                </label>
                <Select value={filterPhase} onValueChange={setFilterPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Fases</SelectItem>
                    <SelectItem value="1">Fase 1 - Sobrevivência</SelectItem>
                    <SelectItem value="2">Fase 2 - Crescimento</SelectItem>
                    <SelectItem value="3">Fase 3 - Organização</SelectItem>
                    <SelectItem value="4">Fase 4 - Consolidação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Filtrar por Período
                </label>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o Período</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Últimos 12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando diagnósticos...</p>
          </div>
        ) : filteredDiagnostics.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">
                Nenhum diagnóstico encontrado com os filtros selecionados
              </p>
              <Button onClick={() => navigate(createPageUrl("Home"))}>
                Fazer Primeiro Diagnóstico
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDiagnostics.map((diagnostic) => {
              const phaseInfo = getPhaseInfo(diagnostic.phase);
              const PhaseIcon = phaseInfo.icon;

              return (
                <Card key={diagnostic.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl ${phaseInfo.color} flex items-center justify-center`}>
                          <PhaseIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={phaseInfo.color}>
                              Fase {diagnostic.phase}
                            </Badge>
                            <Badge variant="outline">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(diagnostic.created_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900">
                            {phaseInfo.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Letra predominante: {diagnostic.dominant_letter}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate(createPageUrl("Resultado") + `?id=${diagnostic.id}`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
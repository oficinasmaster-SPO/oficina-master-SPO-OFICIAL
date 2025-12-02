import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, TrendingUp, Users, BarChart3, Rocket, Filter, LayoutGrid, User, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { assessmentCriteria } from "../components/assessment/AssessmentCriteria";

export default function Historico() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  // Combine all queries
  const { data: allAssessments = [], isLoading } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const [diagnostics, processAssessments, entrepreneurDiagnostics] = await Promise.all([
        base44.entities.Diagnostic.list(),
        base44.entities.ProcessAssessment.list(),
        base44.entities.EntrepreneurDiagnostic.list()
      ]);

      // Normalize data
      const normalizedDiagnostics = (diagnostics || []).map(d => ({
        ...d,
        type: 'diagnostic',
        typeName: 'Diagnóstico de Fase',
        title: `Fase ${d.phase}`,
        date: d.created_date,
        status: d.completed ? 'concluido' : 'pendente',
        score: d.dominant_letter,
        detailsUrl: `Resultado?id=${d.id}`
      }));

      const normalizedProcess = (processAssessments || []).map(p => ({
        ...p,
        type: 'process',
        typeName: 'Autoavaliação de Processos',
        title: assessmentCriteria[p.assessment_type]?.title || p.assessment_type,
        date: p.created_date,
        status: p.completed ? 'concluido' : 'pendente',
        score: `${p.average_score?.toFixed(1)}/10`,
        detailsUrl: `ResultadoAutoavaliacao?id=${p.id}`
      }));

      const normalizedEntrepreneur = (entrepreneurDiagnostics || []).map(e => ({
        ...e,
        type: 'entrepreneur',
        typeName: 'Perfil do Empresário',
        title: e.dominant_profile ? e.dominant_profile.charAt(0).toUpperCase() + e.dominant_profile.slice(1) : 'Perfil',
        date: e.created_date,
        status: e.completed ? 'concluido' : 'pendente',
        score: null,
        detailsUrl: `ResultadoEmpresario?id=${e.id}`
      }));

      return [...normalizedDiagnostics, ...normalizedProcess, ...normalizedEntrepreneur]
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    initialData: []
  });

  const filterItems = () => {
    let filtered = [...allAssessments];

    if (filterType !== "all") {
      filtered = filtered.filter(item => item.type === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(item => item.status === filterStatus);
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
        filtered = filtered.filter(item => new Date(item.date) >= cutoffDate);
      }
    }

    return filtered;
  };

  const filteredItems = filterItems();

  const getTypeIcon = (type) => {
    switch (type) {
      case 'diagnostic': return TrendingUp;
      case 'process': return LayoutGrid;
      case 'entrepreneur': return User;
      default: return FileText;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'concluido') {
      return <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Concluído</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Minhas Avaliações Realizadas
          </h1>
          <p className="text-gray-600">
            Histórico completo de diagnósticos e autoavaliações
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Tipo de Avaliação
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="diagnostic">Fases da Oficina</SelectItem>
                    <SelectItem value="process">Processos (Autoavaliação)</SelectItem>
                    <SelectItem value="entrepreneur">Perfil Empresário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Status
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Período
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

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">
                Nenhuma avaliação encontrada com os filtros selecionados
              </p>
              <Button onClick={() => navigate(createPageUrl("SelecionarDiagnostico"))}>
                Realizar Nova Avaliação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.type);

              return (
                <Card key={`${item.type}-${item.id}`} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <Badge variant="secondary" className="font-normal">
                              {item.typeName}
                            </Badge>
                            {getStatusBadge(item.status)}
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg truncate">
                            {item.title}
                          </h3>
                          {item.score && (
                            <p className="text-sm text-gray-600">
                              Resultado: <span className="font-medium">{item.score}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate(createPageUrl(item.detailsUrl.split('?')[0]) + `?id=${item.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto whitespace-nowrap"
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
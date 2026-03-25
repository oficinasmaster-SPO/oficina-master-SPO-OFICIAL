import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, TrendingUp, Users, BarChart3, User, Calculator, Activity, Brain, DollarSign, FileText, LayoutGrid, CheckCircle2, Clock, Calendar, Eye } from "lucide-react";
import { assessmentCriteria } from "../components/assessment/AssessmentCriteria";
import StatsCards from "@/components/historico/StatsCards";
import ViewToggle from "@/components/historico/ViewToggle";
import SearchBar from "@/components/historico/SearchBar";
import CardsView from "@/components/historico/CardsView";
import TableView from "@/components/historico/TableView";
import TimelineView from "@/components/historico/TimelineView";
import AIInsightsButton from "@/components/historico/AIInsightsButton";

export default function Historico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("cards");

  // Combine all queries
  const { data: allAssessments = [], isLoading } = useQuery({
    queryKey: ['all-assessments', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const safeList = async (entity) => {
        try {
          return await entity.list('-created_date', 500);
        } catch (e) {
          console.error('Error fetching data for an entity:', e);
          return [];
        }
      };

      // Fetch em lotes menores para evitar sobrecarga no banco e falhas silenciosas
      const batch1 = await Promise.all([
        safeList(base44.entities.Diagnostic),
        safeList(base44.entities.ProcessAssessment),
        safeList(base44.entities.EntrepreneurDiagnostic)
      ]);
      const batch2 = await Promise.all([
        safeList(base44.entities.ProductivityDiagnostic),
        safeList(base44.entities.DebtAnalysis),
        safeList(base44.entities.PerformanceMatrixDiagnostic)
      ]);
      const batch3 = await Promise.all([
        safeList(base44.entities.DISCDiagnostic),
        safeList(base44.entities.CollaboratorMaturityDiagnostic),
        safeList(base44.entities.CommercialDiagnostic)
      ]);

      const diagnostics = batch1[0];
      const processAssessments = batch1[1];
      const entrepreneurDiagnostics = batch1[2];

      const productivityDiagnostics = batch2[0];
      const debtAnalyses = batch2[1];
      const performanceDiagnostics = batch2[2];

      const discDiagnostics = batch3[0];
      const maturityDiagnostics = batch3[1];
      const commercialDiagnostics = batch3[2];

      // Collect unique IDs to avoid fetching entire collections if they are huge
      const allItems = [
        ...(diagnostics || []),
        ...(processAssessments || []),
        ...(entrepreneurDiagnostics || []),
        ...(productivityDiagnostics || []),
        ...(debtAnalyses || []),
        ...(performanceDiagnostics || []),
        ...(discDiagnostics || []),
        ...(maturityDiagnostics || []),
        ...(commercialDiagnostics || [])
      ];

      const wIds = [...new Set(allItems.map(i => i.workshop_id).filter(Boolean))];
      const eIds = [...new Set(allItems.map(i => i.employee_id).filter(Boolean))];

      // Fetch only needed workshops and employees using filter $in to reduce payload
      const fetchInChunks = async (entity, ids) => {
        if (!ids.length) return [];
        const chunkSize = 50;
        let results = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          try {
            const data = await entity.filter({ id: { $in: chunk } });
            results = [...results, ...data];
          } catch (e) {
            console.error(`Error fetching chunk for ${entity.name}`, e);
          }
        }
        return results;
      };

      const [workshops, employees] = await Promise.all([
        fetchInChunks(base44.entities.Workshop, wIds),
        fetchInChunks(base44.entities.Employee, eIds)
      ]);

      const workshopMap = (workshops || []).reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {});
      const employeeMap = (employees || []).reduce((acc, e) => ({ ...acc, [e.id]: e.full_name }), {});

      const getNames = (item) => {
        let eName = item.employee_id ? employeeMap[item.employee_id] : null;
        if (!eName && item.candidate_name) eName = item.candidate_name;
        
        return {
          workshopName: item.workshop_id ? workshopMap[item.workshop_id] : null,
          employeeName: eName
        };
      };

      // Normalize data
      const normalizedDiagnostics = (diagnostics || []).map(d => ({
        ...getNames(d),
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
        ...getNames(p),
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
        ...getNames(e),
        type: 'entrepreneur',
        typeName: 'Perfil do Empresário',
        title: e.dominant_profile ? e.dominant_profile.charAt(0).toUpperCase() + e.dominant_profile.slice(1) : 'Perfil',
        date: e.created_date,
        status: e.completed ? 'concluido' : 'pendente',
        score: null,
        detailsUrl: `ResultadoEmpresario?id=${e.id}`
      }));

      const normalizedProductivity = (productivityDiagnostics || []).map(p => ({
        ...p,
        ...getNames(p),
        type: 'productivity',
        typeName: 'Produção vs Salário',
        title: `${p.employee_role} - ${p.period_month}`,
        date: p.created_date,
        status: p.completed ? 'concluido' : 'pendente',
        score: p.classification,
        detailsUrl: `ResultadoProducao?id=${p.id}`
      }));

      const normalizedDebt = (debtAnalyses || []).map(d => ({
        ...d,
        ...getNames(d),
        type: 'debt',
        typeName: 'Endividamento',
        title: `Análise Financeira`,
        date: d.created_date,
        status: d.completed ? 'concluido' : 'pendente',
        score: d.risco_anual,
        detailsUrl: `ResultadoEndividamento?id=${d.id}`
      }));

      const normalizedPerformance = (performanceDiagnostics || []).map(p => ({
        ...p,
        ...getNames(p),
        type: 'performance',
        typeName: 'Desempenho (Matriz)',
        title: p.classification,
        date: p.created_date,
        status: p.completed ? 'concluido' : 'pendente',
        score: `T:${p.technical_average} E:${p.emotional_average}`,
        detailsUrl: `ResultadoDesempenho?id=${p.id}`
      }));

      const normalizedDISC = (discDiagnostics || []).map(d => ({
        ...d,
        ...getNames(d),
        type: 'disc',
        typeName: 'DISC',
        title: d.dominant_profile ? d.dominant_profile.toUpperCase() : 'Perfil',
        date: d.created_date,
        status: d.completed ? 'concluido' : 'pendente',
        score: d.dominant_profile,
        detailsUrl: `ResultadoDISC?id=${d.id}`
      }));

      const normalizedMaturity = (maturityDiagnostics || []).map(m => ({
        ...m,
        ...getNames(m),
        type: 'maturity',
        typeName: 'Maturidade Profissional',
        title: m.maturity_level ? m.maturity_level.toUpperCase() : 'Nível',
        date: m.created_date,
        status: m.completed ? 'concluido' : 'pendente',
        score: m.maturity_level,
        detailsUrl: `ResultadoMaturidade?id=${m.id}`
      }));

      const normalizedCommercial = (commercialDiagnostics || []).map(c => ({
        ...c,
        ...getNames(c),
        type: 'commercial',
        typeName: 'Diagnóstico Comercial',
        title: c.diagnostic_type,
        date: c.created_date,
        status: c.completed ? 'concluido' : 'pendente',
        score: `${c.average_score?.toFixed(1)}/10`,
        detailsUrl: `DiagnosticoComercial?id=${c.id}` // Note: DiagnosticoComercial page handles history view
      }));

      return [
        ...normalizedDiagnostics, 
        ...normalizedProcess, 
        ...normalizedEntrepreneur,
        ...normalizedProductivity,
        ...normalizedDebt,
        ...normalizedPerformance,
        ...normalizedDISC,
        ...normalizedMaturity,
        ...normalizedCommercial
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const filterItems = () => {
    let filtered = [...allAssessments];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(search) ||
        item.typeName.toLowerCase().includes(search) ||
        (item.score && String(item.score).toLowerCase().includes(search))
      );
    }

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
      case 'productivity': return Calculator;
      case 'debt': return DollarSign;
      case 'performance': return Activity;
      case 'disc': return Brain;
      case 'maturity': return Users;
      case 'commercial': return BarChart3;
      default: return FileText;
    }
  };

  const handleViewDetails = (item) => {
    navigate(createPageUrl(item.detailsUrl.split('?')[0]) + `?id=${item.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Minhas Avaliações Realizadas
              </h1>
              <p className="text-gray-600">
                Histórico completo de diagnósticos e autoavaliações
              </p>
            </div>
            <AIInsightsButton assessments={allAssessments} />
          </div>
        </div>

        <StatsCards assessments={allAssessments} />

        {/* Search & Filters */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 mb-4">
              <SearchBar value={searchTerm} onChange={setSearchTerm} />
              <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
            </div>
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
                    <SelectItem value="process">Processos</SelectItem>
                    <SelectItem value="entrepreneur">Perfil Empresário</SelectItem>
                    <SelectItem value="productivity">Produção vs Salário</SelectItem>
                    <SelectItem value="debt">Endividamento</SelectItem>
                    <SelectItem value="performance">Desempenho</SelectItem>
                    <SelectItem value="disc">DISC</SelectItem>
                    <SelectItem value="maturity">Maturidade</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
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

        {/* Content */}
        {isLoading || !user?.id ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Nenhuma avaliação encontrada para sua busca" : "Nenhuma avaliação encontrada com os filtros selecionados"}
              </p>
              <Button onClick={() => navigate(createPageUrl("SelecionarDiagnostico"))}>
                Realizar Nova Avaliação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === "cards" && (
              <CardsView 
                items={filteredItems} 
                onViewDetails={handleViewDetails} 
                getTypeIcon={getTypeIcon} 
              />
            )}
            {viewMode === "table" && (
              <TableView 
                items={filteredItems} 
                onViewDetails={handleViewDetails} 
                getTypeIcon={getTypeIcon} 
              />
            )}
            {viewMode === "timeline" && (
              <TimelineView 
                items={filteredItems} 
                onViewDetails={handleViewDetails} 
                getTypeIcon={getTypeIcon} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, Printer, Share2, AlertTriangle, TrendingUp, Award, Heart, Zap, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function RelatorioCDC() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportId = searchParams.get('id');
  const cdcRecordId = searchParams.get('record_id');

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['cdc-report', reportId, cdcRecordId],
    queryFn: async () => {
      let reportData;
      
      // 1. Tentar buscar relatório existente
      if (reportId) {
        reportData = await base44.entities.CDCReport.get(reportId);
      } else if (cdcRecordId) {
        const reports = await base44.entities.CDCReport.filter({ cdc_record_id: cdcRecordId });
        reportData = reports[0];
      }

      // 2. Se não encontrar, tentar gerar automaticamente (apenas se tivermos o ID do registro)
      if (!reportData && cdcRecordId) {
        try {
          // Precisamos do ID do colaborador para gerar
          const record = await base44.entities.CDCRecord.get(cdcRecordId);
          if (record) {
             // Chamada para a função backend que usa IA
             const { data: newReport } = await base44.functions.invoke('generateCDCReport', {
               cdc_record_id: cdcRecordId,
               employee_id: record.employee_id
             });
             reportData = newReport;
          }
        } catch (err) {
          console.error("Erro ao tentar gerar relatório automaticamente:", err);
        }
      }

      if (!reportData) throw new Error("Relatório não encontrado");

      // Fetch related data
      const employee = await base44.entities.Employee.get(reportData.employee_id);
      const cdcRecord = await base44.entities.CDCRecord.get(reportData.cdc_record_id);

      return { ...reportData, employee, cdcRecord };
    },
    enabled: !!reportId || !!cdcRecordId,
    retry: 1
  });

  const handlePrint = () => {
    window.print();
  };

  const ScoreCard = ({ title, score, icon: Icon, colorClass }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${colorClass.bg}`}>
              <Icon className={`w-5 h-5 ${colorClass.text}`} />
            </div>
            <span className="font-medium text-gray-700">{title}</span>
          </div>
          <span className={`text-2xl font-bold ${colorClass.text}`}>{score}</span>
        </div>
        <Progress value={score} className="h-2" />
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Carregando relatório...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Relatório não encontrado</h1>
        <p className="text-gray-600 mb-6">Não foi possível carregar o relatório solicitado.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const { employee, cdcRecord, scores, analysis } = report;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Actions Header - Hidden on Print */}
        <div className="flex justify-between items-center print:hidden">
          <Button variant="ghost" onClick={() => navigate(createPageUrl("CDCForm") + `?employee_id=${employee.id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Edição
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / PDF
            </Button>
            {/* Share button placeholder - functional implementation would require modal */}
            {/* <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button> */}
          </div>
        </div>

        {/* Report Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatório de Análise CDC</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Colaborador:</span> {employee.full_name}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Cargo:</span> {employee.position}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Data:</span> {new Date(report.created_date).toLocaleDateString()}
                </div>
              </div>
            </div>
            {cdcRecord.disc_profile && (
              <Badge variant="secondary" className="text-lg px-4 py-1">
                DISC: {cdcRecord.disc_profile}
              </Badge>
            )}
          </div>

          {/* Scores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:grid-cols-2">
            <ScoreCard 
              title="Liderança" 
              score={scores.leadership} 
              icon={Award} 
              colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }} 
            />
            <ScoreCard 
              title="Comprometimento" 
              score={scores.commitment} 
              icon={Heart} 
              colorClass={{ bg: 'bg-red-100', text: 'text-red-600' }} 
            />
            <ScoreCard 
              title="Cultura" 
              score={scores.culture_alignment} 
              icon={Users} 
              colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }} 
            />
            <ScoreCard 
              title="Potencial" 
              score={scores.growth_potential} 
              icon={TrendingUp} 
              colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }} 
            />
          </div>

          {/* Analysis Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Main Analysis */}
            <div className="lg:col-span-2 space-y-6">
              
              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Análise Comportamental
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {analysis.behavioral}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                    <Award className="w-5 h-5 text-gray-500" />
                    Potencial de Liderança
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed">
                    {analysis.leadership_potential}
                  </div>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                    <Heart className="w-5 h-5 text-gray-500" />
                    Nível de Comprometimento
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-700 leading-relaxed">
                    {analysis.commitment_level}
                  </div>
                </section>
              </div>

              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                  Plano de Desenvolvimento
                </h3>
                <div className="space-y-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-blue-700 mb-1">Curto Prazo</h4>
                      <p className="text-gray-700">{analysis.development_plan.short_term}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-indigo-700 mb-1">Médio Prazo</h4>
                      <p className="text-gray-700">{analysis.development_plan.medium_term}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-purple-700 mb-1">Longo Prazo</h4>
                      <p className="text-gray-700">{analysis.development_plan.long_term}</p>
                    </CardContent>
                  </Card>
                </div>
              </section>

            </div>

            {/* Right Column: Alerts & Message */}
            <div className="space-y-6">
              
              {analysis.risk_alerts && analysis.risk_alerts.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-red-600 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    Pontos de Atenção
                  </h3>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <ul className="space-y-2">
                      {analysis.risk_alerts.map((alert, index) => (
                        <li key={index} className="flex items-start gap-2 text-red-800 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              <section>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Mensagem Personalizada
                </h3>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 italic text-gray-700 relative">
                  <span className="text-4xl text-yellow-300 absolute top-2 left-2">"</span>
                  <p className="relative z-10 pt-2">{analysis.custom_message}</p>
                  <span className="text-4xl text-yellow-300 absolute bottom-[-10px] right-2">"</span>
                </div>
              </section>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 border border-blue-100">
                <p className="font-semibold mb-1">Nota de Confidencialidade</p>
                <p>Este relatório contém informações sensíveis e deve ser compartilhado apenas com gestores autorizados e o próprio colaborador, a critério da liderança.</p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
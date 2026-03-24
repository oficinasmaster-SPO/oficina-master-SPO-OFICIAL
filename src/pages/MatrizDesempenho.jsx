import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";

export default function MatrizDesempenho() {
  const { user } = useAuth();
  const workshopId = user?.data?.workshop_id || user?.workshop_id;
  const [filterArea, setFilterArea] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['matriz-desempenho', workshopId],
    queryFn: async () => {
      const [employees, perfDiags, discDiags] = await Promise.all([
        base44.entities.Employee.filter({ workshop_id: workshopId, status: 'ativo' }),
        base44.entities.PerformanceMatrixDiagnostic.filter({ workshop_id: workshopId }),
        base44.entities.DISCDiagnostic.filter({ workshop_id: workshopId })
      ]);
      return { employees, perfDiags, discDiags };
    },
    enabled: !!workshopId
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  const mapData = [];
  if (data?.employees) {
    data.employees.forEach(emp => {
      if (filterArea !== 'all' && emp.area !== filterArea) return;
      
      const perf = data.perfDiags.filter(d => d.employee_id === emp.id).sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0];
      const disc = data.discDiags.filter(d => d.employee_id === emp.id).sort((a,b) => new Date(b.created_date) - new Date(a.created_date))[0];
      
      if (perf || disc) {
         let perfScore = 2; 
         if (perf) {
           const avg = (perf.technical_average + perf.emotional_average) / 2;
           if (avg > 8.5) perfScore = 3;
           else if (avg < 5.5) perfScore = 1;
         }

         let potScore = 2;
         if (disc && disc.dominant_profile) {
           // Avaliação de potencial básica
           if (['executor_d', 'analista_c'].includes(disc.dominant_profile)) potScore = 3;
           else potScore = 2;
         }

         mapData.push({
           employee: emp,
           perfScore,
           potScore
         });
      }
    });
  }

  const getBoxEmployees = (x, y) => mapData.filter(d => d.perfScore === x && d.potScore === y);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Matriz de Desempenho (Nine-Box)</h1>
            <p className="text-gray-600 mt-1">Visão integrada de Potencial (DISC) e Desempenho (Competências)</p>
          </div>
          <Link to={createPageUrl("CentralAvaliacoes")}>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          </Link>
        </div>

        <div className="mb-6 flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="w-64">
            <Select value={filterArea} onValueChange={setFilterArea}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="administrativo">Administrativo</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4 h-[650px]">
          <div className="flex flex-col justify-between py-12 items-center rotate-180" style={{ writingMode: 'vertical-rl' }}>
            <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Alto Potencial</span>
            <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Médio Potencial</span>
            <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Baixo Potencial</span>
          </div>

          <div className="flex flex-col h-full gap-4">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <Box title="Acompanhamento" employees={getBoxEmployees(1, 3)} color="bg-orange-50 border-orange-200" titleColor="text-orange-800" />
              <Box title="Talento Promissor" employees={getBoxEmployees(2, 3)} color="bg-blue-50 border-blue-200" titleColor="text-blue-800" />
              <Box title="Alto Potencial (Estrela)" employees={getBoxEmployees(3, 3)} color="bg-green-50 border-green-300" titleColor="text-green-800" icon={<Sparkles className="w-4 h-4 text-green-600"/>} />
            </div>
            
            <div className="grid grid-cols-3 gap-4 flex-1">
              <Box title="Desempenho Inferior" employees={getBoxEmployees(1, 2)} color="bg-red-50 border-red-200" titleColor="text-red-800" />
              <Box title="Essencial" employees={getBoxEmployees(2, 2)} color="bg-yellow-50 border-yellow-200" titleColor="text-yellow-800" />
              <Box title="Alto Desempenho" employees={getBoxEmployees(3, 2)} color="bg-blue-50 border-blue-200" titleColor="text-blue-800" />
            </div>

            <div className="grid grid-cols-3 gap-4 flex-1">
              <Box title="Risco Retenção" employees={getBoxEmployees(1, 1)} color="bg-red-100 border-red-300" titleColor="text-red-900" />
              <Box title="Efetivo" employees={getBoxEmployees(2, 1)} color="bg-orange-50 border-orange-200" titleColor="text-orange-800" />
              <Box title="Profissional Maduro" employees={getBoxEmployees(3, 1)} color="bg-yellow-50 border-yellow-200" titleColor="text-yellow-800" />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm">Baixo Desempenho</div>
              <div className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm">Médio Desempenho</div>
              <div className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm">Alto Desempenho</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Box({ title, employees, color, titleColor, icon }) {
  return (
    <Card className={`h-full overflow-y-auto border-2 ${color} transition-all hover:shadow-md`}>
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className={`text-sm font-bold ${titleColor}`}>{title}</CardTitle>
        {icon && icon}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-2 mt-2">
          {employees.length === 0 && <span className="text-xs text-gray-400 italic">Vazio</span>}
          {employees.map((d, i) => (
            <div key={i} className="bg-white px-3 py-2 rounded-lg text-xs shadow-sm font-medium border border-gray-200 hover:border-gray-300 cursor-default transition-colors">
              {d.employee.full_name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
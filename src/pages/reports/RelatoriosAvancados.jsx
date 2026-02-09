import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, BarChart3, Calendar } from "lucide-react";
import DiagnosticReports from "../../components/relatorios/DiagnosticReports";
import FinancialReports from "../../components/relatorios/FinancialReports";
import CustomReports from "../../components/relatorios/CustomReports";
import ReportFilters from "../../components/relatorios/ReportFilters";

export default function RelatoriosAvancados() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    diagnosticType: "todos",
    module: "todos"
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Relatórios Avançados
          </h1>
          <p className="text-gray-600">
            Análises detalhadas e customizáveis da sua oficina
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Filtros Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportFilters filters={filters} onChange={setFilters} />
          </CardContent>
        </Card>

        <Tabs defaultValue="diagnosticos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diagnosticos">
              <FileText className="w-4 h-4 mr-2" />
              Diagnósticos
            </TabsTrigger>
            <TabsTrigger value="financeiro">
              <TrendingUp className="w-4 h-4 mr-2" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="customizado">
              <BarChart3 className="w-4 h-4 mr-2" />
              Customizado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagnosticos">
            <DiagnosticReports filters={filters} />
          </TabsContent>

          <TabsContent value="financeiro">
            <FinancialReports filters={filters} />
          </TabsContent>

          <TabsContent value="customizado">
            <CustomReports filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

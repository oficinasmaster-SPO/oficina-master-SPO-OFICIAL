import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, User, Calendar, Award } from "lucide-react";
import { format } from "date-fns";

export default function HistoricoDesempenho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      const workshopId = workshops[0]?.id;

      const [diagsData, empsData] = await Promise.all([
        base44.entities.PerformanceMatrixDiagnostic.filter({ workshop_id: workshopId }, '-created_date'),
        base44.entities.Employee.list()
      ]);

      setDiagnostics(diagsData);
      setEmployees(empsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id) => {
    return employees.find(e => e.id === id)?.full_name || "Desconhecido";
  };

  const filteredDiagnostics = diagnostics.filter(d => {
    const name = getEmployeeName(d.employee_id);
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Desempenho</h1>
            <p className="text-gray-600">Matriz de decisão e classificações</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("DiagnosticoDesempenho"))}>Nova Avaliação</Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 flex gap-4 items-center">
            <Search className="text-gray-400" />
            <Input 
              placeholder="Buscar por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Média Técnica</TableHead>
                <TableHead>Média Emocional</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiagnostics.map((diag) => (
                <TableRow key={diag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {format(new Date(diag.created_date), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold">{getEmployeeName(diag.employee_id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{diag.technical_average}</TableCell>
                  <TableCell>{diag.emotional_average}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      diag.classification === 'investimento' ? 'bg-green-100 text-green-700' :
                      diag.classification === 'demissao' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {diag.classification?.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(createPageUrl("ResultadoDesempenho") + `?id=${diag.id}`)}
                    >
                      Ver Resultado
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

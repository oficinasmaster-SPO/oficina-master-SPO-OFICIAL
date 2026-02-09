import React, { useState } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue  } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, AlertTriangle, TrendingUp, Calendar, FileText, Heart, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { differenceInDays, format } from "date-fns";

export default function MonitoramentoRH() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAlert, setFilterAlert] = useState("all");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date')
  });

  const { data: coexContracts = [] } = useQuery({
    queryKey: ['coex-contracts'],
    queryFn: () => base44.entities.COEXContract.list('-created_date')
  });

  const { data: productivityDiagnostics = [] } = useQuery({
    queryKey: ['productivity-diagnostics'],
    queryFn: () => base44.entities.ProductivityDiagnostic.list('-created_date')
  });

  // AnÃ¡lise de cada colaborador
  const employeesWithAlerts = employees.map(emp => {
    const activeCOEX = coexContracts.find(c => c.employee_id === emp.id && c.status === 'ativo');
    const daysUntilCoexExpiry = activeCOEX ? differenceInDays(new Date(activeCOEX.end_date), new Date()) : null;
    
    const latestProductivity = productivityDiagnostics
      .filter(d => d.employee_id === emp.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    const alerts = [];
    
    // Alertas COEX
    if (!activeCOEX) {
      alerts.push({ type: 'coex_missing', severity: 'high', message: 'Sem COEX ativo' });
    } else if (daysUntilCoexExpiry !== null && daysUntilCoexExpiry <= 7) {
      alerts.push({ type: 'coex_expiring', severity: 'high', message: `COEX expira em ${daysUntilCoexExpiry} dias` });
    } else if (daysUntilCoexExpiry !== null && daysUntilCoexExpiry <= 30) {
      alerts.push({ type: 'coex_soon', severity: 'medium', message: `COEX expira em ${daysUntilCoexExpiry} dias` });
    }

    // Alertas CDC
    if (!emp.cdc_completed) {
      alerts.push({ type: 'cdc_missing', severity: 'medium', message: 'CDC nÃ£o realizado' });
    }

    // Alertas de Produtividade
    if (latestProductivity) {
      if (latestProductivity.classification === 'acima_aceitavel') {
        alerts.push({ type: 'productivity_low', severity: 'high', message: 'Produtividade abaixo do esperado' });
      } else if (latestProductivity.classification === 'aceitavel') {
        alerts.push({ type: 'productivity_warning', severity: 'medium', message: 'Produtividade no limite' });
      }
    }

    return {
      ...emp,
      alerts,
      activeCOEX,
      daysUntilCoexExpiry,
      latestProductivity
    };
  });

  // Filtros
  const filteredEmployees = employeesWithAlerts.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || emp.status === filterStatus;
    const matchesAlert = filterAlert === "all" || 
                        (filterAlert === "with_alerts" && emp.alerts.length > 0) ||
                        (filterAlert === "no_alerts" && emp.alerts.length === 0);
    
    return matchesSearch && matchesStatus && matchesAlert;
  });

  // EstatÃ­sticas gerais
  const stats = {
    total: employees.length,
    withAlerts: employeesWithAlerts.filter(e => e.alerts.length > 0).length,
    noCDC: employees.filter(e => !e.cdc_completed).length,
    noCOEX: employees.filter(e => !coexContracts.find(c => c.employee_id === e.id && c.status === 'ativo')).length,
    coexExpiringSoon: employeesWithAlerts.filter(e => e.daysUntilCoexExpiry !== null && e.daysUntilCoexExpiry <= 30).length
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'high': 'bg-red-100 text-red-700 border-red-300',
      'medium': 'bg-orange-100 text-orange-700 border-orange-300',
      'low': 'bg-yellow-100 text-yellow-700 border-yellow-300'
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Monitoramento RH Completo</h1>
          <p className="text-gray-600">Acompanhamento integrado de CDC, COEX e Desempenho</p>
        </div>

        {/* EstatÃ­sticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.withAlerts}</div>
                  <div className="text-xs text-gray-600">Com Alertas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-pink-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.noCDC}</div>
                  <div className="text-xs text-gray-600">Sem CDC</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.noCOEX}</div>
                  <div className="text-xs text-gray-600">Sem COEX</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.coexExpiringSoon}</div>
                  <div className="text-xs text-gray-600">COEX a expirar</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="ferias">FÃ©rias</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAlert} onValueChange={setFilterAlert}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Alertas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with_alerts">Com alertas</SelectItem>
                  <SelectItem value="no_alerts">Sem alertas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Colaboradores */}
        <div className="space-y-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{employee.full_name}</h3>
                      <Badge variant="outline">{employee.position}</Badge>
                    </div>

                    {/* Alertas */}
                    {employee.alerts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {employee.alerts.map((alert, idx) => (
                          <Badge key={idx} className={getSeverityColor(alert.severity)}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {alert.message}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Status CDC/COEX */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${employee.cdc_completed ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className={employee.cdc_completed ? 'text-green-600' : 'text-gray-500'}>
                          CDC {employee.cdc_completed ? 'âœ“' : 'âœ—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${employee.activeCOEX ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={employee.activeCOEX ? 'text-blue-600' : 'text-gray-500'}>
                          COEX {employee.activeCOEX ? 'âœ“' : 'âœ—'}
                        </span>
                      </div>
                      {employee.latestProductivity && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <span className="text-purple-600">
                            Produtividade: {employee.latestProductivity.cost_percentage?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(createPageUrl("DetalhesColaborador") + `?id=${employee.id}`)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredEmployees.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                Nenhum colaborador encontrado com os filtros selecionados
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}




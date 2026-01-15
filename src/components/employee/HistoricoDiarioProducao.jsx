import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Eye, Plus, X, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ManualGoalRegistration from "@/components/goals/ManualGoalRegistration";

export default function HistoricoDiarioProducao({ employee, onUpdate }) {
  const [expandedRecords, setExpandedRecords] = useState({});
  const [dailyHistoryFromDB, setDailyHistoryFromDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualRegistration, setShowManualRegistration] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const dailyHistory = dailyHistoryFromDB.length > 0 ? dailyHistoryFromDB : (employee.daily_production_history || []);

  React.useEffect(() => {
    loadDailyHistory();
  }, [employee.id]);

  const loadDailyHistory = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().substring(0, 7);
      const records = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: employee.workshop_id,
        employee_id: employee.id,
        month: currentMonth
      });

      if (records && records.length > 0) {
        const formattedHistory = records.map(record => ({
          id: record.id,
          date: record.reference_date,
          parts_revenue: record.revenue_parts || 0,
          services_revenue: record.revenue_services || 0,
          total_revenue: record.revenue_total || 0,
          notes: record.notes || ""
        }));
        
        setDailyHistoryFromDB(formattedHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSave = async () => {
    await loadDailyHistory();
    setShowManualRegistration(false);
    setEditingRecord(null);
    toast.success("Registro salvo com sucesso!");
  };

  const handleDelete = async (recordId) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      await base44.entities.MonthlyGoalHistory.delete(recordId);
      toast.success("Registro excluído com sucesso!");
      await loadDailyHistory();
    } catch (error) {
      console.error("Erro ao deletar registro:", error);
      toast.error("Erro ao deletar registro");
    }
  };

  const toggleRecordExpansion = (index) => {
    setExpandedRecords(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };



  return (
    <div className="space-y-6">

      {/* Formulário de Registro */}
      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle>Histórico Diário da Produção</CardTitle>
             <Button onClick={() => {
               setShowManualRegistration(true);
               setEditingRecord(null);
             }} className="bg-blue-600 hover:bg-blue-700">
               <Plus className="w-4 h-4 mr-2" />
               Novo Registro
             </Button>
           </div>
         </CardHeader>
         <CardContent>

          {/* Lista de Registros */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando histórico...</p>
            </div>
          ) : dailyHistory.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum registro diário encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyHistory.map((entry, index) => {
                const isExpanded = expandedRecords[index];

                return (
                  <Card key={`${entry.date}-${index}`} className="hover:shadow-md transition-all border-l-4 border-gray-300">
                    <CardContent className="p-4">
                      {/* Visão Compacta - Sempre Visível */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Data */}
                          <div className="text-center min-w-[60px]">
                            <p className="text-2xl font-bold text-gray-900">
                              {new Date(entry.date).getDate()}
                            </p>
                            <p className="text-xs text-gray-500 uppercase">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short' })}
                            </p>
                          </div>

                          {/* Info Principal */}
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                day: '2-digit', 
                                month: 'long'
                              })}
                            </p>


                          </div>

                          {/* Previsto e Realizado - Lado a Lado */}
                          <div className="flex gap-3 items-stretch">
                            <div className="text-right bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 shadow-sm min-w-[120px]">
                              <p className="text-xs text-purple-600 font-semibold mb-1">Previsto</p>
                              <p className="text-lg font-bold text-purple-600">
                                R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="text-right bg-white px-3 py-2 rounded-lg border border-green-200 shadow-sm min-w-[120px]">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Realizado</p>
                              <p className={`text-lg font-bold ${metaDayAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                                R$ {entry.total_revenue.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Botão Expandir */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleRecordExpansion(index)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Fechar
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </>
                            )}
                          </Button>

                          {/* Ações */}
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingRecord(entry);
                                setShowManualRegistration(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                       <div className="grid grid-cols-3 gap-4">
                         <div className="bg-blue-50 p-3 rounded-lg">
                           <p className="text-xs text-blue-700 mb-1">Faturamento Peças</p>
                           <p className="text-lg font-bold text-blue-600">
                             R$ {entry.parts_revenue.toFixed(2)}
                           </p>
                         </div>
                         <div className="bg-green-50 p-3 rounded-lg">
                           <p className="text-xs text-green-700 mb-1">Faturamento Serviços</p>
                           <p className="text-lg font-bold text-green-600">
                             R$ {entry.services_revenue.toFixed(2)}
                           </p>
                         </div>
                         <div className="bg-purple-50 p-3 rounded-lg">
                           <p className="text-xs text-purple-700 mb-1">Total do Dia</p>
                           <p className="text-lg font-bold text-purple-600">
                             R$ {entry.total_revenue.toFixed(2)}
                           </p>
                         </div>
                       </div>

                       {entry.notes && (
                         <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                           <p className="text-xs text-yellow-800 font-semibold mb-1">📝 Observações:</p>
                           <p className="text-sm text-gray-700">{entry.notes}</p>
                         </div>
                       )}
                      </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </CardContent>
          </Card>

          {/* Modal Unificado */}
          <ManualGoalRegistration
          open={showManualRegistration}
          onClose={() => {
          setShowManualRegistration(false);
          setEditingRecord(null);
          }}
          workshop={{ id: employee.workshop_id }}
          editingRecord={editingRecord}
          onSave={handleRegistrationSave}
          />
          </div>
          );
          }
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import OrganizationalClimateAnalyzer from "@/components/rh/OrganizationalClimateAnalyzer";
import AITrainingSuggestions from "@/components/rh/AITrainingSuggestions";

export default function AnalisesRH() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const ownedWorkshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
      let userWorkshop = Array.isArray(ownedWorkshops) && ownedWorkshops.length > 0 
        ? ownedWorkshops[0] 
        : null;

      if (!userWorkshop && currentUser.workshop_id) {
        userWorkshop = await base44.entities.Workshop.get(currentUser.workshop_id);
      }

      if (!userWorkshop) {
        const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
        if (employees && employees.length > 0 && employees[0].workshop_id) {
          userWorkshop = await base44.entities.Workshop.get(employees[0].workshop_id);
        }
      }

      setWorkshop(userWorkshop);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Oficina não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises Inteligentes de RH</h1>
          <p className="text-gray-600">Insights gerados por IA para decisões estratégicas</p>
        </div>

        <Tabs defaultValue="clima" className="space-y-6">
          <TabsList className="grid grid-cols-2 bg-white shadow-md">
            <TabsTrigger value="clima">
              <BarChart3 className="w-4 h-4 mr-2" />
              Clima Organizacional
            </TabsTrigger>
            <TabsTrigger value="treinamentos">
              <TrendingUp className="w-4 h-4 mr-2" />
              Recomendação de Treinamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clima">
            <OrganizationalClimateAnalyzer workshopId={workshop.id} />
          </TabsContent>

          <TabsContent value="treinamentos">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Sistema de Recomendação de Treinamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmployeeTrainingSelector 
                  workshopId={workshop.id}
                  onSelect={setSelectedEmployee}
                />
                {selectedEmployee && (
                  <div className="mt-6">
                    <AITrainingSuggestions 
                      employee={selectedEmployee}
                      onClose={() => setSelectedEmployee(null)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmployeeTrainingSelector({ workshopId, onSelect }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, [workshopId]);

  const loadEmployees = async () => {
    try {
      const result = await base44.entities.Employee.filter({ workshop_id: workshopId });
      setEmployees(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar colaboradores");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Selecione um colaborador:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            className="p-4 border-2 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="font-semibold text-gray-900">{emp.full_name}</div>
            <div className="text-sm text-gray-600">{emp.position}</div>
            <div className="text-xs text-gray-500 mt-1">{emp.area || 'Área não definida'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
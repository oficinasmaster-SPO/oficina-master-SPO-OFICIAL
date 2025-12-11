import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Edit } from "lucide-react";
import OrgChart from "@/components/organization/OrgChart";

export default function Organograma() {
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: () => base44.entities.Employee.filter({ workshop_id: workshop.id }),
    enabled: !!workshop
  });

  const { data: structures = [], isLoading: loadingStructures } = useQuery({
    queryKey: ['org-structures', workshop?.id],
    queryFn: () => base44.entities.OrganizationStructure.filter({ workshop_id: workshop.id }),
    enabled: !!workshop
  });

  if (!user || !workshop || loadingEmployees || loadingStructures) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organograma</h1>
            <p className="text-gray-600">Estrutura hierárquica da sua oficina</p>
          </div>
          <Button onClick={() => setEditMode(!editMode)} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            {editMode ? "Visualizar" : "Editar Estrutura"}
          </Button>
        </div>

        {structures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">Configure seu Organograma</h3>
              <p className="text-gray-600 mb-4">
                Defina a estrutura hierárquica dos seus colaboradores
              </p>
              <Button onClick={() => setEditMode(true)}>
                Começar Configuração
              </Button>
            </CardContent>
          </Card>
        ) : editMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Editar Relações Hierárquicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.map(emp => {
                  const structure = structures.find(s => s.employee_id === emp.id);
                  return (
                    <div key={emp.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{emp.full_name}</p>
                        <p className="text-sm text-gray-600">{emp.position}</p>
                      </div>
                      <div className="w-64">
                        <Select 
                          value={structure?.manager_id || ""}
                          onValueChange={async (value) => {
                            if (structure) {
                              await base44.entities.OrganizationStructure.update(structure.id, {
                                manager_id: value || null
                              });
                            } else {
                              await base44.entities.OrganizationStructure.create({
                                workshop_id: workshop.id,
                                employee_id: emp.id,
                                manager_id: value || null,
                                department: emp.area,
                                hierarchy_level: 2
                              });
                            }
                            window.location.reload();
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar gestor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>Sem gestor (topo)</SelectItem>
                            {employees.filter(e => e.id !== emp.id).map(e => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.full_name} - {e.position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <OrgChart employees={employees} structures={structures} />
        )}
      </div>
    </div>
  );
}
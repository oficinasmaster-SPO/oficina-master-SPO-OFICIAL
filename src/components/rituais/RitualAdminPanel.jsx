import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Edit2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import RitualFormDialog from "./RitualFormDialog";

export default function RitualAdminPanel({ workshop, onRitualsUpdate }) {
  const [ritualsDB, setRitualsDB] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workshop?.id) {
      loadData();
    }
  }, [workshop?.id]);

  const loadData = async () => {
    try {
      const [ritualsData, employeesData] = await Promise.all([
        base44.entities.Ritual.filter({ workshop_id: workshop.id }),
        base44.entities.Employee.filter({ workshop_id: workshop.id, status: "ativo" })
      ]);
      setRitualsDB(ritualsData);
      setEmployees(employeesData);
      if (onRitualsUpdate) onRitualsUpdate(ritualsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar rituais personalizados");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRitual(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (ritual) => {
    setEditingRitual(ritual);
    setIsDialogOpen(true);
  };

  const handleDelete = async (ritual) => {
    if (!confirm(`Deseja realmente excluir o ritual "${ritual.name}"?`)) return;

    try {
      await base44.entities.Ritual.delete(ritual.id);
      toast.success("Ritual excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir ritual");
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingRitual) {
        await base44.entities.Ritual.update(editingRitual.id, formData);
        toast.success("Ritual atualizado!");
      } else {
        await base44.entities.Ritual.create({
          ...formData,
          workshop_id: workshop.id
        });
        toast.success("Ritual criado!");
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar ritual");
    }
  };

  const getResponsibleName = (userId) => {
    const employee = employees.find(e => e.user_id === userId);
    return employee?.full_name || "Não definido";
  };

  const frequencyLabels = {
    diario: { label: "Diário", color: "bg-green-100 text-green-800" },
    semanal: { label: "Semanal", color: "bg-blue-100 text-blue-800" },
    quinzenal: { label: "Quinzenal", color: "bg-purple-100 text-purple-800" },
    mensal: { label: "Mensal", color: "bg-orange-100 text-orange-800" },
    trimestral: { label: "Trimestral", color: "bg-pink-100 text-pink-800" },
    continuo: { label: "Contínuo", color: "bg-indigo-100 text-indigo-800" },
    eventual: { label: "Eventual", color: "bg-gray-100 text-gray-800" }
  };

  return (
    <>
      <Card className="bg-white border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle>Painel Administrativo de Rituais</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Gerencie rituais personalizados da sua oficina
                </p>
              </div>
            </div>
            <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ritual
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <p className="text-center text-gray-500">Carregando...</p>
          ) : ritualsDB.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Nenhum ritual personalizado criado ainda
              </p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Ritual
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ritualsDB.map((ritual) => {
                const freqInfo = frequencyLabels[ritual.frequency] || frequencyLabels.eventual;
                return (
                  <Card key={ritual.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm flex-1">
                          {ritual.name}
                        </h3>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(ritual)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(ritual)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                        {ritual.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={freqInfo.color}>
                          {freqInfo.label}
                        </Badge>
                        {ritual.active ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
                        )}
                      </div>
                      {ritual.responsible_user_id && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{getResponsibleName(ritual.responsible_user_id)}</span>
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

      <RitualFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        ritual={editingRitual}
        employees={employees}
        onSave={handleSave}
      />
    </>
  );
}
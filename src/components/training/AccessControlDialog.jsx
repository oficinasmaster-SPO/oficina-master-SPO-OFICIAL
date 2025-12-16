import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Users, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AccessControlDialog({ open, onClose, course, onSuccess }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', course?.workshop_id],
    queryFn: async () => {
      if (course?.workshop_id) {
        return await base44.entities.Employee.filter({
          workshop_id: course.workshop_id,
          status: 'ativo'
        });
      }
      return [];
    },
    enabled: !!course?.workshop_id && open
  });

  useEffect(() => {
    if (course) {
      setSelectedUsers(course.assigned_to_ids || []);
    }
  }, [course, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.TrainingCourse.update(course.id, {
        assigned_to_ids: selectedUsers
      });
      toast.success("Controle de acesso atualizado!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = () => {
    if (selectedUsers.length === employees.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(employees.map(e => e.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Controle de Acesso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              {selectedUsers.length === 0
                ? "Sem restrições - todos podem acessar"
                : `${selectedUsers.length} colaborador(es) selecionado(s)`}
            </AlertDescription>
          </Alert>

          {employees.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum colaborador encontrado
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="select-all"
                  checked={selectedUsers.length === employees.length}
                  onCheckedChange={toggleAll}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Selecionar Todos ({employees.length})
                </Label>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-2">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        id={`emp-${emp.id}`}
                        checked={selectedUsers.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, emp.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== emp.id));
                          }
                        }}
                      />
                      <Label htmlFor={`emp-${emp.id}`} className="cursor-pointer flex-1">
                        <div className="font-medium">{emp.full_name}</div>
                        <div className="text-xs text-gray-500">{emp.position}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
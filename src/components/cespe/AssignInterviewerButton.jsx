import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AssignInterviewerButton({ candidateId, currentInterviewer, workshopId }) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(currentInterviewer || "");
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['workshop-employees', workshopId],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ 
        workshop_id: workshopId,
        status: 'ativo'
      });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId && open
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const employee = employees.find(e => e.id === selectedUser);
      return await base44.entities.Candidate.update(candidateId, {
        assigned_interviewer_id: selectedUser,
        assigned_interviewer_name: employee?.full_name || ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success("Entrevistador atribuído");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atribuir");
    }
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className={currentInterviewer ? "border-blue-200 text-blue-600" : ""}
      >
        <UserCheck className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Entrevistador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Selecione um gestor/entrevistador</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} - {emp.position}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => assignMutation.mutate()}
              disabled={!selectedUser || assignMutation.isPending}
            >
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
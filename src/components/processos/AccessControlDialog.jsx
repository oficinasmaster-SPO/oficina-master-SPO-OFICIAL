import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

export default function AccessControlDialog({ open, onClose, processType, processId, workshopId }) {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [accessLevel, setAccessLevel] = useState("visualizacao");

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active', workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      const all = await base44.entities.Employee.filter({ 
        workshop_id: workshopId,
        user_status: 'ativo'
      });
      return all.filter(e => e.email);
    },
    enabled: !!workshopId && open
  });

  const grantAccessMutation = useMutation({
    mutationFn: async () => {
      const employee = employees.find(e => e.id === selectedEmployee);
      if (!employee) throw new Error("Colaborador não encontrado");

      return await base44.entities.ProcessAccess.create({
        workshop_id: workshopId,
        process_type: processType,
        process_id: processId,
        employee_id: employee.id,
        employee_name: employee.full_name,
        employee_email: employee.email,
        access_level: accessLevel,
        status: "ativo"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-access']);
      toast.success("Acesso concedido!");
      setSelectedEmployee("");
      setAccessLevel("visualizacao");
      onClose();
    },
    onError: (error) => {
      toast.error("Erro ao conceder acesso: " + error.message);
    }
  });

  const handleGrant = () => {
    if (!selectedEmployee) {
      toast.error("Selecione um colaborador");
      return;
    }
    grantAccessMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Conceder Acesso ao Processo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Colaborador</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nível de Acesso</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visualizacao">Visualização</SelectItem>
                <SelectItem value="execucao">Execução</SelectItem>
                <SelectItem value="edicao">Edição</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {accessLevel === "visualizacao" && "Apenas visualizar o processo"}
              {accessLevel === "execucao" && "Visualizar e registrar execuções"}
              {accessLevel === "edicao" && "Visualizar, executar e editar"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleGrant} disabled={grantAccessMutation.isPending}>
            {grantAccessMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Conceder Acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
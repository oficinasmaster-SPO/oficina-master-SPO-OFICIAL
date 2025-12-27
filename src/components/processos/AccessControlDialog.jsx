import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AccessControlDialog({ open, onClose, process, processType, workshop }) {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [accessLevel, setAccessLevel] = useState("visualizacao");

  const { data: employees = [] } = useQuery({
    queryKey: ['workshop-employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        user_status: 'ativo'
      });
    },
    enabled: !!workshop?.id && open
  });

  const { data: existingAccess = [] } = useQuery({
    queryKey: ['process-access', process?.id],
    queryFn: async () => {
      if (!process?.id) return [];
      return await base44.entities.ProcessAccess.filter({
        process_id: process.id,
        status: 'ativo'
      });
    },
    enabled: !!process?.id && open
  });

  const grantAccessM = useMutation({
    mutationFn: async () => {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (!employee) throw new Error("Colaborador não encontrado");

      const user = await base44.auth.me();

      return await base44.entities.ProcessAccess.create({
        workshop_id: workshop.id,
        process_type: processType,
        process_id: process.id,
        employee_id: employee.id,
        employee_name: employee.full_name,
        employee_email: employee.email,
        granted_by: user.email,
        granted_at: new Date().toISOString(),
        access_level: accessLevel,
        status: 'ativo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-access']);
      toast.success("Acesso liberado!");
      setSelectedEmployeeId("");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    }
  });

  const revokeM = useMutation({
    mutationFn: async (accessId) => {
      return await base44.entities.ProcessAccess.update(accessId, { status: 'revogado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['process-access']);
      toast.success("Acesso revogado!");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Controle de Acesso</DialogTitle>
          <p className="text-sm text-gray-600">{process?.title}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Liberar Acesso para Colaborador</Label>
            <div className="flex gap-2">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => !existingAccess.some(a => a.employee_id === e.id)).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizacao">Visualização</SelectItem>
                  <SelectItem value="execucao">Execução</SelectItem>
                  <SelectItem value="edicao">Edição</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => grantAccessM.mutate()} disabled={!selectedEmployeeId || grantAccessM.isPending}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-3 block">Acessos Ativos</Label>
            {existingAccess.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum acesso liberado ainda</p>
            ) : (
              <div className="space-y-2">
                {existingAccess.map(access => (
                  <div key={access.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{access.employee_name}</p>
                      <p className="text-xs text-gray-600">{access.employee_email}</p>
                      <Badge variant="outline" className="mt-1">{access.access_level}</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => revokeM.mutate(access.id)}
                      disabled={revokeM.isPending}
                    >
                      Revogar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {  Card, CardContent, CardHeader, CardTitle, CardFooter  } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter  } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue  } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, CheckCircle2, Clock, FileText, AlertTriangle, MoreVertical, Calendar, Timer, Image as ImageIcon, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { Link } from "react-router-dom";

export default function TechnicianQGP() {
  const [user, setUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [predictedTime, setPredictedTime] = useState("");
  const [viewOsDialog, setViewOsDialog] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const u = await base44.auth.me();
      setUser(u);
    };
    loadUser();
  }, []);

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-qgp-tasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const allTasks = await base44.entities.Task.list();
      // Filter tasks assigned to me or where I am the main technician
      return allTasks.filter(t => 
        (t.employee_id === user.id || t.assigned_to?.includes(user.id)) &&
        t.status !== 'concluida' && 
        t.status !== 'cancelada'
      ).sort((a, b) => {
        // Sort: In progress first, then by priority
        if (a.status === 'em_andamento' && b.status !== 'em_andamento') return -1;
        if (a.status !== 'em_andamento' && b.status === 'em_andamento') return 1;
        return 0;
      });
    },
    enabled: !!user,
    refetchInterval: 10000
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, data = {} }) => {
      // If pausing, add pause record
      let updateData = { status, ...data };
      
      // If starting, record start time if not exists? (Backend should handle or we handle here)
      // We just update status for now
      
      return await base44.entities.Task.update(id, updateData);
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries(['my-qgp-tasks']);
      setIsPauseDialogOpen(false);
      setPauseReason("");
    }
  });

  const handleStart = (task) => {
    updateStatusMutation.mutate({ id: task.id, status: 'em_andamento' });
  };

  const handlePause = () => {
    if (!selectedTask || !pauseReason) return;
    
    // Update task with waiting reason in qgp_data
    const qgpUpdate = {
      ...selectedTask.qgp_data,
      waiting_reason: 'outros', // simplified, could be mapped from reason
      waiting_notes: pauseReason
    };

    updateStatusMutation.mutate({ 
      id: selectedTask.id, 
      status: 'pausada',
      data: { qgp_data: qgpUpdate }
    });
  };

  const handleFinish = (task) => {
    if(confirm("Confirmar conclusÃ£o do serviÃ§o?")) {
      updateStatusMutation.mutate({ id: task.id, status: 'concluida', data: { completed_date: new Date().toISOString(), progress: 100 } });
    }
  };
  
  const handleSetTime = () => {
    if (!selectedTask || !predictedTime) return;
    const minutes = parseInt(predictedTime) * 60; // assuming input in hours for simplicity or simple number
    
    updateStatusMutation.mutate({ 
      id: selectedTask.id, 
      status: selectedTask.status, // keep status
      data: { predicted_time_minutes: minutes }
    });
    setIsTimeDialogOpen(false);
    setPredictedTime("");
  };

  if (!user) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

  const activeTask = myTasks.find(t => t.status === 'em_andamento');

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Minha Fila QGP</h1>
            <p className="text-sm text-gray-500">OlÃ¡, {user.full_name?.split(' ')[0]}</p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
            {myTasks.length} serviÃ§os
          </div>
        </div>

        {/* Active Task - Hero Card */}
        {activeTask ? (
          <Card className="border-2 border-green-500 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-pulse"></div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className="bg-green-500 hover:bg-green-600">EM EXECUÃ‡ÃƒO</Badge>
                <span className="font-mono font-bold text-lg text-gray-700">OS #{activeTask.qgp_data?.os_number}</span>
              </div>
              <CardTitle className="text-xl mt-2">{activeTask.title}</CardTitle>
              <p className="text-gray-500 text-sm">{activeTask.qgp_data?.vehicle_model} â€¢ {activeTask.qgp_data?.vehicle_plate}</p>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Previsto */}
               <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Tempo Previsto</p>
                    <p className="font-bold text-gray-900">
                      {activeTask.predicted_time_minutes ? `${activeTask.predicted_time_minutes / 60}h` : <span className="text-red-500 text-xs">NÃ£o definido</span>}
                    </p>
                  </div>
                  {!activeTask.predicted_time_minutes && (
                    <Button size="sm" variant="outline" className="ml-auto text-xs h-7" onClick={() => { setSelectedTask(activeTask); setIsTimeDialogOpen(true); }}>
                      Definir
                    </Button>
                  )}
               </div>

               {/* OS Button */}
               {activeTask.qgp_data?.os_file_url && (
                 <Button variant="outline" className="w-full justify-between group" onClick={() => { setSelectedTask(activeTask); setViewOsDialog(true); }}>
                   <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> Ver Ordem de ServiÃ§o</span>
                   <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                 </Button>
               )}

               <div className="grid grid-cols-2 gap-3 pt-2">
                 <Button 
                    variant="outline" 
                    className="border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => { setSelectedTask(activeTask); setIsPauseDialogOpen(true); }}
                  >
                   <Pause className="w-4 h-4 mr-2" /> Pausar
                 </Button>
                 <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleFinish(activeTask)}
                  >
                   <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar
                 </Button>
               </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
            <p>VocÃª nÃ£o tem serviÃ§os em execuÃ§Ã£o.</p>
            <p className="text-sm mt-1">Inicie um serviÃ§o da lista abaixo.</p>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700 pl-1">PrÃ³ximos ServiÃ§os</h3>
          {myTasks.filter(t => t.id !== activeTask?.id).map(task => (
            <Card key={task.id} className={`border-l-4 ${task.status === 'pausada' ? 'border-l-orange-400 bg-orange-50/50' : 'border-l-gray-300'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="font-mono font-bold text-sm text-gray-600">#{task.qgp_data?.os_number}</span>
                       {task.status === 'pausada' && <Badge variant="outline" className="bg-orange-100 text-orange-800 text-[10px] h-5">PAUSADO</Badge>}
                     </div>
                     <h4 className="font-bold text-gray-900">{task.title}</h4>
                     <p className="text-xs text-gray-500">{task.qgp_data?.vehicle_model} â€¢ {task.qgp_data?.vehicle_plate}</p>
                   </div>
                   <Button size="icon" className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md" onClick={() => handleStart(task)}>
                     <Play className="w-5 h-5 text-white ml-1" />
                   </Button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.predicted_time_minutes ? `${task.predicted_time_minutes/60}h` : '--'}
                  </span>
                  {task.qgp_data?.os_file_url && (
                    <button className="text-blue-600 hover:underline flex items-center gap-1" onClick={() => { setSelectedTask(task); setViewOsDialog(true); }}>
                      <FileText className="w-3 h-3" /> Ver OS
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Pausa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {['AlmoÃ§o', 'PeÃ§as', 'AprovaÃ§Ã£o', 'Fim de Expediente', 'Outros'].map(reason => (
                <Button 
                  key={reason} 
                  variant={pauseReason === reason ? "default" : "outline"}
                  onClick={() => setPauseReason(reason)}
                  className="justify-start"
                >
                  {reason}
                </Button>
              ))}
            </div>
            {pauseReason === 'Outros' && (
              <Textarea placeholder="Descreva o motivo..." />
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)}>Cancelar</Button>
             <Button onClick={handlePause} disabled={!pauseReason} className="bg-orange-600 hover:bg-orange-700">Confirmar Pausa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Tempo Previsto</DialogTitle>
          </DialogHeader>
          <div className="py-4">
             <Label>Tempo estimado (horas)</Label>
             <Input 
               type="number" 
               placeholder="Ex: 1.5" 
               value={predictedTime} 
               onChange={(e) => setPredictedTime(e.target.value)} 
               className="text-lg"
             />
             <p className="text-xs text-gray-500 mt-2">Insira o tempo total estimado para conclusÃ£o do serviÃ§o.</p>
          </div>
          <DialogFooter>
             <Button onClick={handleSetTime}>Salvar PrevisÃ£o</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOsDialog} onOpenChange={setViewOsDialog}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ordem de ServiÃ§o #{selectedTask?.qgp_data?.os_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 rounded border h-full overflow-hidden">
            {selectedTask?.qgp_data?.os_file_url ? (
               selectedTask.qgp_data.os_file_url.endsWith('.pdf') ? (
                 <iframe src={selectedTask.qgp_data.os_file_url} className="w-full h-full" />
               ) : (
                 <img src={selectedTask.qgp_data.os_file_url} className="w-full h-full object-contain" />
               )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">Arquivo indisponÃ­vel</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}




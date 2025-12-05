import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Timer, Play, Pause, Square, RotateCcw, MoreVertical, Truck, User, AlertTriangle, Search, Maximize2, Minimize2 } from "lucide-react";
import { format, differenceInMinutes, addMinutes, isWithinInterval, parse, set } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import AIPrioritizationAssistant from "@/components/tasks/AIPrioritizationAssistant";
import AIResourceAllocator from "@/components/tasks/AIResourceAllocator";
import BottleneckDetector from "@/components/ai-analytics/BottleneckDetector";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"; // For Bottleneck modal

export default function QGPBoard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Fetch Tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['qgp-tasks'],
    queryFn: async () => {
      // Filter tasks that are relevant to QGP (not completed or completed today)
      // For board we want active stuff mainly
      const allTasks = await base44.entities.Task.list();
      return allTasks.filter(t => 
        t.status !== 'concluida' && 
        t.status !== 'cancelada' &&
        (t.task_type?.startsWith('qgp') || t.priority === 'urgente' || t.task_type === 'geral')
      ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)); // FIFO mostly
    },
    refetchInterval: 30000 // Refresh every 30s for "TV" mode
  });

  // Fetch Employees for names
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  // Refetch helper
  const refreshTasks = () => queryClient.invalidateQueries(['qgp-tasks']);

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name.split(' ')[0] : 'N/A';
  };

  // Workshop data for lunch settings
  const { data: workshop } = useQuery({
    queryKey: ['workshop-qgp'],
    queryFn: async () => {
      const ws = await base44.entities.Workshop.list();
      return ws[0]; // Assuming single workshop for now
    }
  });

  // Calculate Predicted End Time with Lunch Logic
  const calculatePredictedEnd = (task) => {
    if (!task.predicted_time_minutes) return null;
    
    const baseTime = task.status === 'em_andamento' ? new Date(task.updated_date) : new Date(); 
    let predictedEnd = addMinutes(baseTime, task.predicted_time_minutes);
    
    // Lunch Logic (Employee specific or Workshop default)
    const employee = employees.find(e => e.id === task.employee_id);
    const lunchStartStr = employee?.shift_settings?.lunch_start || workshop?.horario_funcionamento?.almoco_inicio;
    const lunchEndStr = employee?.shift_settings?.lunch_end || workshop?.horario_funcionamento?.almoco_fim;

    if (lunchStartStr && lunchEndStr) {
      const today = new Date();
      const lunchStart = parse(lunchStartStr, 'HH:mm', today);
      const lunchEnd = parse(lunchEndStr, 'HH:mm', today);
      
      // Check if the task interval overlaps with lunch
      // If the task start is before lunch and predicted end is after lunch start
      if (baseTime < lunchStart && predictedEnd > lunchStart) {
         const lunchDuration = differenceInMinutes(lunchEnd, lunchStart);
         predictedEnd = addMinutes(predictedEnd, lunchDuration);
      }
    }
    
    return predictedEnd;
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.qgp_data?.os_number?.includes(searchTerm) ||
    t.qgp_data?.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status, task) => {
    if (task.qgp_data?.waiting_reason) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (status === 'em_andamento') return "bg-green-100 text-green-800 border-green-200 animate-pulse";
    if (status === 'pausada') return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusText = (status, task) => {
    if (task.qgp_data?.waiting_reason) return `Parada: ${task.qgp_data.waiting_reason}`;
    if (status === 'em_andamento') return "Executando";
    if (status === 'pausada') return "Pausado";
    return "Aguardando";
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-4 ${isFullScreen ? 'p-8' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QGP - Quadro de Gestão de Pátio</h1>
            <p className="text-blue-300 text-sm flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {format(currentTime, "dd 'de' MMMM 'às' HH:mm:ss", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              className="bg-gray-800 border-gray-700 text-white pl-10 w-64 focus:ring-blue-500"
              placeholder="Buscar OS, Placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* AI Features */}
          <div className="flex gap-2">
            <AIPrioritizationAssistant tasks={tasks} onApplyChanges={refreshTasks} />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-orange-900/20 text-orange-400 border-orange-900/50 hover:bg-orange-900/40">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Gargalos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <BottleneckDetector 
                  workshop={workshop} 
                  employees={employees} 
                  osAssessments={[]} // Optional if focusing on tasks
                  tasks={tasks}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Button 
            variant="outline" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
            {isFullScreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
          </Button>
          <Link to={createPageUrl('TechnicianQGP')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <User className="w-4 h-4 mr-2" />
              Visão Técnico
            </Button>
          </Link>
        </div>
      </div>

      {/* Board Content */}
      <div className="grid gap-4 overflow-x-auto">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-900/50 text-gray-400 font-medium text-sm uppercase tracking-wider border-b border-gray-700">
            <div className="col-span-1">O.S.</div>
            <div className="col-span-1">Placa</div>
            <div className="col-span-2">Veículo</div>
            <div className="col-span-2">Técnico</div>
            <div className="col-span-1">Previsto</div>
            <div className="col-span-1">Fim Est.</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Parada / Obs</div>
          </div>

          <div className="divide-y divide-gray-700">
            <AnimatePresence>
              {filteredTasks.map((task) => {
                const predictedEnd = calculatePredictedEnd(task);
                const isDelayed = predictedEnd && predictedEnd < currentTime && task.status !== 'concluida';
                
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-750 transition-colors ${isDelayed ? 'bg-red-900/10' : ''}`}
                  >
                    <div className="col-span-1 font-mono font-bold text-xl text-white">
                      {task.qgp_data?.os_number || '---'}
                    </div>
                    <div className="col-span-1">
                      <Badge variant="outline" className="bg-gray-800 text-yellow-400 border-yellow-600/30 font-mono text-sm px-2 py-1">
                        {task.qgp_data?.vehicle_plate?.toUpperCase() || '---'}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-gray-300 font-medium truncate">
                      {task.qgp_data?.vehicle_model || task.title}
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      {task.employee_id ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-700/30 text-blue-400 font-bold text-xs">
                            {getEmployeeName(task.employee_id).charAt(0)}
                          </div>
                          <span className="text-gray-300">{getEmployeeName(task.employee_id)}</span>
                        </>
                      ) : (
                        <AIResourceAllocator 
                          task={task} 
                          employees={employees} 
                          currentTasks={tasks} 
                          onAssign={refreshTasks} 
                        />
                      )}
                    </div>
                    <div className="col-span-1 text-gray-400 font-mono">
                      {task.predicted_time_minutes ? `${Math.floor(task.predicted_time_minutes / 60)}h${task.predicted_time_minutes % 60}m` : '-'}
                    </div>
                    <div className={`col-span-1 font-mono font-bold ${isDelayed ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                      {predictedEnd ? format(predictedEnd, 'HH:mm') : '-'}
                    </div>
                    <div className="col-span-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(task.status, task)}`}>
                        {getStatusText(task.status, task)}
                      </span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-400 truncate flex items-center gap-2">
                      {task.qgp_data?.waiting_reason && (
                         <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                      {task.qgp_data?.waiting_notes || task.qgp_data?.waiting_reason || '-'}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {filteredTasks.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">Nenhum veículo no pátio no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
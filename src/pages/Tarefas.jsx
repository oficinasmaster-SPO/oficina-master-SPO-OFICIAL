import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Calendar, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { isPast, isToday, isThisWeek, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

import TaskCard from "../components/tasks/TaskCard";
import TaskForm from "../components/tasks/TaskForm";
import TaskFilters from "../components/tasks/TaskFilters";

export default function Tarefas() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    priority: "all",
    assignedTo: "all",
    workshop: "all",
    overdue: false,
    dueToday: false,
    dueThisWeek: false
  });

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
      toast.error("Erro ao carregar dados do usuário");
    }
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    enabled: !!user
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => base44.entities.Workshop.list(),
    enabled: !!user && (user.role === 'admin' || user.role === 'user')
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({
      ...data,
      workshop_id: workshop?.id || null
    }),
    onSuccess: async (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      toast.success("Tarefa criada!");

      // Enviar notificações
      if (task.assigned_to && task.assigned_to.length > 0) {
        for (const userId of task.assigned_to) {
          await base44.entities.Notification.create({
            user_id: userId,
            type: "nova_tarefa",
            title: "Nova Tarefa Atribuída",
            message: `Você foi atribuído à tarefa: ${task.title}`,
            is_read: false
          });
        }
      }
    },
    onError: () => toast.error("Erro ao criar tarefa")
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
      toast.success("Tarefa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar tarefa")
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarefa excluída!");
    },
    onError: () => toast.error("Erro ao excluir tarefa")
  });

  const handleSubmit = (data) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const task = tasks.find(t => t.id === id);
    const updateData = { 
      status: newStatus,
      progress: newStatus === 'concluida' ? 100 : newStatus === 'em_andamento' ? 50 : 0
    };
    
    if (newStatus === 'concluida') {
      updateData.completed_date = new Date().toISOString();
    }

    updateTaskMutation.mutate({ id, data: updateData });

    // Notificar criador
    if (task.created_by && newStatus === 'concluida') {
      await base44.entities.Notification.create({
        user_id: task.created_by,
        type: "status_alterado",
        title: "Tarefa Concluída",
        message: `A tarefa "${task.title}" foi marcada como concluída`,
        is_read: false
      });
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      assignedTo: "all",
      workshop: "all",
      overdue: false,
      dueToday: false,
      dueThisWeek: false
    });
  };

  // Aplicar filtros
  const filteredTasks = tasks.filter(task => {
    // Busca
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Status
    if (filters.status !== "all" && task.status !== filters.status) {
      return false;
    }

    // Prioridade
    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    // Atribuído a
    if (filters.assignedTo !== "all") {
      if (filters.assignedTo === "me") {
        if (!task.assigned_to?.includes(user.id)) return false;
      } else {
        if (!task.assigned_to?.includes(filters.assignedTo)) return false;
      }
    }

    // Oficina
    if (filters.workshop !== "all" && task.workshop_id !== filters.workshop) {
      return false;
    }

    // Atrasadas
    if (filters.overdue && task.due_date) {
      const isTaskOverdue = isPast(new Date(task.due_date)) && task.status !== 'concluida';
      if (!isTaskOverdue) return false;
    }

    // Vence hoje
    if (filters.dueToday && task.due_date) {
      if (!isToday(new Date(task.due_date))) return false;
    }

    // Vence esta semana
    if (filters.dueThisWeek && task.due_date) {
      if (!isThisWeek(new Date(task.due_date))) return false;
    }

    return true;
  });

  // Estatísticas
  const stats = {
    total: filteredTasks.length,
    pendente: filteredTasks.filter(t => t.status === 'pendente').length,
    em_andamento: filteredTasks.filter(t => t.status === 'em_andamento').length,
    concluida: filteredTasks.filter(t => t.status === 'concluida').length,
    atrasadas: filteredTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'concluida').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ListTodo className="w-8 h-8 text-blue-600" />
              Gerenciamento de Tarefas
            </h1>
            <p className="text-gray-600 mt-1">
              Organize, atribua e acompanhe tarefas da sua equipe
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-gray-100">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border-2 border-yellow-200">
            <p className="text-sm text-yellow-800">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pendente}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 shadow-sm border-2 border-blue-200">
            <p className="text-sm text-blue-800">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-900">{stats.em_andamento}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 shadow-sm border-2 border-green-200">
            <p className="text-sm text-green-800">Concluídas</p>
            <p className="text-2xl font-bold text-green-900">{stats.concluida}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 shadow-sm border-2 border-red-200">
            <p className="text-sm text-red-800">Atrasadas</p>
            <p className="text-2xl font-bold text-red-900">{stats.atrasadas}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <TaskFilters
            filters={filters}
            onFilterChange={setFilters}
            employees={employees}
            workshops={workshops}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="mb-6">
            <TaskForm
              task={editingTask}
              employees={employees}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
              submitting={createTaskMutation.isPending || updateTaskMutation.isPending}
            />
          </div>
        )}

        {/* Lista de Tarefas */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Nenhuma tarefa encontrada</p>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira tarefa
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                employees={employees}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
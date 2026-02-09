import React, { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {  Card, CardContent, CardHeader, CardTitle, CardDescription  } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import {  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter  } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {  Select, SelectContent, SelectItem, SelectTrigger, SelectValue  } from "@/components/ui/select";
import {  Table, TableBody, TableCell, TableHead, TableHeader, TableRow  } from "@/components/ui/table";
import { Search, Calendar, Edit, Phone, History, Filter, User, Save, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clientes() {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [filters, setFilters] = useState({ workshop_id: "all", status: "all" });
    const [workshops, setWorkshops] = useState([]);

    useEffect(() => {
        const init = async () => {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            
            if (currentUser.role === 'admin') {
                const wsList = await base44.entities.Workshop.list();
                setWorkshops(wsList);
            } else {
                // For non-admins, find their workshop to filter automatically if needed, 
                // though RLS or backend filtering usually handles security.
                // We'll fetch workshops owned by them for filter context if they own multiple.
                const wsList = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
                setWorkshops(wsList);
            }
        };
        init();
    }, []);

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients', filters],
        queryFn: async () => {
            let query = {};
            if (filters.workshop_id !== "all") query.workshop_id = filters.workshop_id;
            if (filters.status !== "all") query.status = filters.status;
            
            // Fetch all and filter in memory for search term if API doesn't support complex search
            // Ideally backend supports search, but here we'll do client side search for name/phone
            const result = await base44.entities.Client.list('-created_date');
            
            // If user is not admin, filter by their workshops (though RLS should handle access, 
            // explicit filtering helps UI consistency)
            if (user && user.role !== 'admin') {
                 const myWorkshops = workshops.map(w => w.id);
                 return result.filter(c => myWorkshops.includes(c.workshop_id));
            }
            
            return result;
        },
        enabled: !!user
    });

    const { data: feedbacks = [], isLoading: isLoadingFeedbacks } = useQuery({
        queryKey: ['client-feedbacks', selectedClient?.id],
        queryFn: async () => {
            if (!selectedClient) return [];
            // First try fetching by client_id
            let result = await base44.entities.CustomerFeedback.filter({ client_id: selectedClient.id });
            
            // Fallback: match by phone if client_id missing (legacy data)
            if (result.length === 0 && selectedClient.phone) {
                 result = await base44.entities.CustomerFeedback.filter({ customer_phone: selectedClient.phone });
            }
            return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        },
        enabled: !!selectedClient && isHistoryOpen
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Client.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clients']);
            toast.success("Cliente atualizado com sucesso!");
            setIsEditOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar cliente.")
    });

    const filteredClients = clients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = client.name?.toLowerCase().includes(searchLower) || 
                              client.phone?.includes(searchTerm);
        
        const matchesWorkshop = filters.workshop_id === "all" || client.workshop_id === filters.workshop_id;
        const matchesStatus = filters.status === "all" || (client.status || 'ativo') === filters.status;

        return matchesSearch && matchesWorkshop && matchesStatus;
    });

    const handleEdit = (client) => {
        setEditForm({ ...client });
        setSelectedClient(client);
        setIsEditOpen(true);
    };

    const handleViewHistory = (client) => {
        setSelectedClient(client);
        setIsHistoryOpen(true);
    };

    const handleSaveEdit = () => {
        updateMutation.mutate(editForm);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'ativo': return 'bg-green-100 text-green-800';
            case 'inativo': return 'bg-gray-100 text-gray-800';
            case 'risco': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <User className="w-8 h-8 text-blue-600" />
                            GestÃ£o de Clientes
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Gerencie sua base de clientes e histÃ³rico de relacionamentos
                        </p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <User className="w-4 h-4 mr-2" /> Novo Cliente
                    </Button>
                </div>

                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input 
                                    placeholder="Buscar por nome ou telefone..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            {user?.role === 'admin' && (
                                <Select 
                                    value={filters.workshop_id} 
                                    onValueChange={(v) => setFilters({...filters, workshop_id: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Oficina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Oficinas</SelectItem>
                                        {workshops.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select 
                                value={filters.status} 
                                onValueChange={(v) => setFilters({...filters, status: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Status</SelectItem>
                                    <SelectItem value="ativo">Ativo</SelectItem>
                                    <SelectItem value="risco">Em Risco</SelectItem>
                                    <SelectItem value="inativo">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Telefone</TableHead>
                                            {user?.role === 'admin' && <TableHead>Oficina</TableHead>}
                                            <TableHead>Status</TableHead>
                                            <TableHead>Ãšltima AvaliaÃ§Ã£o</TableHead>
                                            <TableHead>PrÃ³x. Contato</TableHead>
                                            <TableHead className="text-right">AÃ§Ãµes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                    Nenhum cliente encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClients.map((client) => (
                                                <TableRow key={client.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium">{client.name}</TableCell>
                                                    <TableCell>{client.phone}</TableCell>
                                                    {user?.role === 'admin' && (
                                                        <TableCell>
                                                            {workshops.find(w => w.id === client.workshop_id)?.name || '-'}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <Badge className={getStatusColor(client.status || 'ativo')}>
                                                            {client.status || 'ativo'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {client.last_evaluation_date 
                                                            ? format(new Date(client.last_evaluation_date), "dd/MM/yyyy")
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {client.next_follow_up ? (
                                                            <div className={`flex items-center gap-1 ${new Date(client.next_follow_up) < new Date() ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                                                <Calendar className="w-3 h-3" />
                                                                {format(new Date(client.next_follow_up), "dd/MM/yyyy")}
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => handleViewHistory(client)}
                                                                title="HistÃ³rico"
                                                            >
                                                                <History className="w-4 h-4 text-purple-600" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => handleEdit(client)}
                                                                title="Editar"
                                                            >
                                                                <Edit className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modal de EdiÃ§Ã£o / Follow-up */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Editar Cliente</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <Input 
                                        value={editForm.name || ""} 
                                        onChange={e => setEditForm({...editForm, name: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input 
                                        value={editForm.phone || ""} 
                                        onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select 
                                        value={editForm.status || "ativo"} 
                                        onValueChange={v => setEditForm({...editForm, status: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ativo">Ativo</SelectItem>
                                            <SelectItem value="inativo">Inativo</SelectItem>
                                            <SelectItem value="risco">Risco (Churn)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-blue-600 font-bold flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Agendar Follow-up
                                    </Label>
                                    <Input 
                                        type="date"
                                        value={editForm.next_follow_up ? editForm.next_follow_up.split('T')[0] : ""} 
                                        onChange={e => setEditForm({...editForm, next_follow_up: new Date(e.target.value).toISOString()})} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas Internas</Label>
                                <Textarea 
                                    rows={4}
                                    value={editForm.notes || ""} 
                                    onChange={e => setEditForm({...editForm, notes: e.target.value})} 
                                    placeholder="AnotaÃ§Ãµes sobre o cliente..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Save className="w-4 h-4 mr-2" /> Salvar AlteraÃ§Ãµes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal de HistÃ³rico */}
                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>HistÃ³rico de Feedbacks - {selectedClient?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            {isLoadingFeedbacks ? (
                                <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
                            ) : feedbacks.length === 0 ? (
                                <p className="text-center text-gray-500">Nenhum feedback registrado.</p>
                            ) : (
                                feedbacks.map((feedback) => (
                                    <Card key={feedback.id} className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={feedback.nps_score >= 9 ? "success" : feedback.nps_score >= 7 ? "warning" : "destructive"}>
                                                        NPS {feedback.nps_score}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">
                                                        {format(new Date(feedback.created_date), "dd/MM/yyyy HH:mm")}
                                                    </span>
                                                </div>
                                                <Badge variant="outline">{feedback.area}</Badge>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                {feedback.sales_service_clarity_score && <div>Vendas: {feedback.sales_service_clarity_score}</div>}
                                                {feedback.technical_service_score && <div>TÃ©cnico: {feedback.technical_service_score}</div>}
                                                {feedback.infrastructure_score && <div>Estrutura: {feedback.infrastructure_score}</div>}
                                                {feedback.delight_score && <div>Encantamento: {feedback.delight_score}</div>}
                                            </div>

                                            {feedback.comment && (
                                                <div className="bg-gray-50 p-2 rounded text-sm italic text-gray-700">
                                                    "{feedback.comment}"
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setIsHistoryOpen(false)}>Fechar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}




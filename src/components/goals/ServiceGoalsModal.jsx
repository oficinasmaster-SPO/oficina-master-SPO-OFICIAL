import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Target } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";

export default function ServiceGoalsModal({ isOpen, onClose, employeeName, goals = [], onSave }) {
    // Default services if empty
    const initialServices = goals.length > 0 ? goals : [
        { service_type: "Mão de Obra", goal_value: 0 },
        { service_type: "Peças", goal_value: 0 },
        { service_type: "Alinhamento/Balanceamento", goal_value: 0 }
    ];

    const [serviceGoals, setServiceGoals] = useState(initialServices);

    const updateGoal = (index, field, value) => {
        const newGoals = [...serviceGoals];
        newGoals[index][field] = field === 'goal_value' ? parseFloat(value) || 0 : value;
        setServiceGoals(newGoals);
    };

    const addService = () => {
        setServiceGoals([...serviceGoals, { service_type: "", goal_value: 0 }]);
    };

    const removeService = (index) => {
        setServiceGoals(serviceGoals.filter((_, i) => i !== index));
    };

    const totalGoal = serviceGoals.reduce((acc, curr) => acc + curr.goal_value, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Metas por Serviço - {employeeName}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                    <div className="bg-blue-50 p-3 rounded-lg mb-4 flex justify-between items-center">
                        <span className="text-sm text-blue-800 font-medium">Meta Total Atual:</span>
                        <span className="text-lg font-bold text-blue-700">{formatCurrency(totalGoal)}</span>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo de Serviço / Categoria</TableHead>
                                <TableHead className="text-right">Meta (R$)</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {serviceGoals.map((goal, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Input 
                                            value={goal.service_type} 
                                            onChange={(e) => updateGoal(index, 'service_type', e.target.value)}
                                            placeholder="Ex: Troca de Óleo"
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={goal.goal_value} 
                                            onChange={(e) => updateGoal(index, 'goal_value', e.target.value)}
                                            className="h-8 text-right"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => removeService(index)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <Button variant="outline" size="sm" onClick={addService} className="mt-2 w-full border-dashed">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Categoria
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onSave(serviceGoals)} className="bg-blue-600 hover:bg-blue-700">
                        Salvar Detalhamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
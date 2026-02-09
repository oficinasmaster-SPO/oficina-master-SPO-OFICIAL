import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, TrendingUp, TrendingDown, Minus, Upload } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

export default function IndicatorsTab({ processId, workshopId }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    measurement_type: "numero",
    target_value: 0,
    current_value: 0,
    measurement_frequency: "mensal"
  });

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ['indicators', processId],
    queryFn: async () => {
      return await base44.entities.ProcessIndicator.filter({ process_id: processId });
    },
    enabled: !!processId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ProcessIndicator.create({
        process_id: processId,
        workshop_id: workshopId,
        ...data
      });
    },
    onSuccess: () => {
      toast.success("Indicador criado!");
      queryClient.invalidateQueries(['indicators', processId]);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      measurement_type: "numero",
      target_value: 0,
      current_value: 0,
      measurement_frequency: "mensal"
    });
  };

  const getPerformanceIcon = (current, target) => {
    if (current >= target) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (current >= target * 0.8) return <Minus className="w-5 h-5 text-yellow-600" />;
    return <TrendingDown className="w-5 h-5 text-red-600" />;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Indicadores de Desempenho (KPIs)</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Indicador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Indicador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome do Indicador</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Taxa de Retrabalho"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Medição</Label>
                  <Select value={formData.measurement_type} onValueChange={(v) => setFormData({ ...formData, measurement_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numero">Número</SelectItem>
                      <SelectItem value="percentual">Percentual</SelectItem>
                      <SelectItem value="tempo">Tempo</SelectItem>
                      <SelectItem value="monetario">Monetário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequência</Label>
                  <Select value={formData.measurement_frequency} onValueChange={(v) => setFormData({ ...formData, measurement_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meta</Label>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Valor Atual</Label>
                  <Input
                    type="number"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Indicador'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {indicators.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum indicador configurado</p>
            <p className="text-sm text-gray-500 mt-1">Configure pelo menos 1 KPI para monitorar este processo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.map((indicator) => {
            const performance = (indicator.current_value / indicator.target_value) * 100;
            return (
              <Card key={indicator.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{indicator.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{indicator.description}</p>
                    </div>
                    {getPerformanceIcon(indicator.current_value, indicator.target_value)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Atual:</span>
                      <span className="font-semibold">{indicator.current_value}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Meta:</span>
                      <span className="font-semibold">{indicator.target_value}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Performance:</span>
                      <Badge variant={performance >= 100 ? "default" : performance >= 80 ? "secondary" : "destructive"}>
                        {performance.toFixed(0)}%
                      </Badge>
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {indicator.measurement_frequency}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
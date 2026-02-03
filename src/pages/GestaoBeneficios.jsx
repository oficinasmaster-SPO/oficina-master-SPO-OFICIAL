import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Gift, Plus, Edit, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/formatters";

export default function GestaoBeneficios() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    tipo_beneficio: "",
    valor_solicitado: 0,
    justificativa: "",
    documentos_anexos: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const employees = await base44.entities.Employee.filter({ user_id: currentUser.id });
      if (employees && employees.length > 0) {
        setEmployee(employees[0]);
        
        // Buscar solicitações de benefícios (usar entity genérica ou criar nova)
        // Para este exemplo, vou criar registros em Notification com type específico
        const requests = await base44.entities.Notification.filter({
          user_id: currentUser.id,
          type: 'solicitacao_beneficio'
        });
        setSolicitacoes(requests || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await base44.entities.Notification.create({
        user_id: user.id,
        workshop_id: employee.workshop_id,
        type: 'solicitacao_beneficio',
        title: `Solicitação: ${formData.tipo_beneficio}`,
        message: formData.justificativa,
        metadata: {
          tipo_beneficio: formData.tipo_beneficio,
          valor_solicitado: formData.valor_solicitado,
          status: 'pendente',
          employee_id: employee.id
        }
      });

      toast.success("Solicitação enviada para aprovação!");
      setShowModal(false);
      setFormData({
        tipo_beneficio: "",
        valor_solicitado: 0,
        justificativa: "",
        documentos_anexos: []
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar solicitação");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const beneficiosAtuais = employee?.benefits || [];
  const totalBeneficios = beneficiosAtuais.reduce((sum, b) => sum + (b.valor || 0), 0);

  const statusColors = {
    pendente: "bg-yellow-100 text-yellow-800",
    aprovado: "bg-green-100 text-green-800",
    rejeitado: "bg-red-100 text-red-800"
  };

  const statusIcons = {
    pendente: Clock,
    aprovado: CheckCircle,
    rejeitado: XCircle
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Gift className="w-10 h-10 text-blue-600" />
            Gestão de Benefícios
          </h1>
          <p className="text-gray-600 mt-2">
            Visualize seus benefícios e solicite alterações
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Benefícios Atuais */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Gift className="w-5 h-5" />
            Seus Benefícios Atuais
          </CardTitle>
          <CardDescription>Total mensal: {formatCurrency(totalBeneficios)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-sm text-gray-600">Salário Base</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(employee?.salary || 0)}
              </p>
            </div>
            {beneficiosAtuais.map((beneficio, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">{beneficio.nome}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(beneficio.valor || 0)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {solicitacoes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma solicitação enviada</p>
          ) : (
            <div className="space-y-3">
              {solicitacoes.map((sol) => {
                const status = sol.metadata?.status || 'pendente';
                const StatusIcon = statusIcons[status];
                
                return (
                  <div key={sol.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{sol.title}</h3>
                          <Badge className={statusColors[status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{sol.message}</p>
                        {sol.metadata?.valor_solicitado && (
                          <p className="text-lg font-bold text-blue-600">
                            Valor: {formatCurrency(sol.metadata.valor_solicitado)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Enviado em {new Date(sol.created_date).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Solicitação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Benefício</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select 
                value={formData.tipo_beneficio} 
                onValueChange={(value) => setFormData({ ...formData, tipo_beneficio: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vale_alimentacao">Vale Alimentação</SelectItem>
                  <SelectItem value="vale_transporte">Vale Transporte</SelectItem>
                  <SelectItem value="plano_saude">Plano de Saúde</SelectItem>
                  <SelectItem value="plano_odontologico">Plano Odontológico</SelectItem>
                  <SelectItem value="auxilio_educacao">Auxílio Educação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Solicitado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_solicitado}
                onChange={(e) => setFormData({ ...formData, valor_solicitado: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Justificativa</Label>
              <Textarea
                value={formData.justificativa}
                onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                placeholder="Explique o motivo da solicitação..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
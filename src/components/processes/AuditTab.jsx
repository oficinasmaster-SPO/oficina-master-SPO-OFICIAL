import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AuditTab({ processId, workshopId }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    audit_date: new Date().toISOString().split('T')[0],
    audit_type: "interna",
    overall_score: 0,
    recommendations: ""
  });

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits', processId],
    queryFn: async () => {
      const result = await base44.entities.ProcessAudit.filter({ process_id: processId });
      return result.sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
    },
    enabled: !!processId
  });

  const createAuditMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return await base44.entities.ProcessAudit.create({
        process_id: processId,
        workshop_id: workshopId,
        auditor_id: user.id,
        auditor_name: user.full_name || user.email,
        ...data,
        conformity_checklist: [],
        non_conformities: [],
        action_plan: []
      });
    },
    onSuccess: () => {
      toast.success("Auditoria criada!");
      queryClient.invalidateQueries(['audits', processId]);
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      audit_date: new Date().toISOString().split('T')[0],
      audit_type: "interna",
      overall_score: 0,
      recommendations: ""
    });
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critica': 'bg-red-100 text-red-800',
      'maior': 'bg-orange-100 text-orange-800',
      'menor': 'bg-yellow-100 text-yellow-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Auditorias & Avaliações</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Auditoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Auditoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Data da Auditoria</Label>
                <Input
                  type="date"
                  value={formData.audit_date}
                  onChange={(e) => setFormData({ ...formData, audit_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo de Auditoria</Label>
                <Select value={formData.audit_type} onValueChange={(v) => setFormData({ ...formData, audit_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interna">Interna</SelectItem>
                    <SelectItem value="externa">Externa</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="certificacao">Certificação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nota Geral (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.overall_score}
                  onChange={(e) => setFormData({ ...formData, overall_score: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Recomendações</Label>
                <Textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createAuditMutation.mutate(formData)}
                disabled={createAuditMutation.isPending}
                className="w-full"
              >
                {createAuditMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Auditoria'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {audits.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma auditoria realizada ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {audits.map((audit) => (
            <Card key={audit.id} className="border-l-4 border-orange-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      Auditoria {audit.audit_type} - {new Date(audit.audit_date).toLocaleDateString()}
                    </CardTitle>
                    <p className="text-sm text-gray-600">Auditor: {audit.auditor_name}</p>
                  </div>
                  <Badge className="bg-blue-600 text-white">
                    Nota: {audit.overall_score || 0}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {audit.non_conformities?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Não Conformidades</h4>
                    <div className="space-y-2">
                      {audit.non_conformities.map((nc, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{nc.description}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge className={getSeverityColor(nc.severity)} variant="outline">
                                {nc.severity}
                              </Badge>
                              <Badge variant="outline">{nc.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {audit.recommendations && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Recomendações</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{audit.recommendations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
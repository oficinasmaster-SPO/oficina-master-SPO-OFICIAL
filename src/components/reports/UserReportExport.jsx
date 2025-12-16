import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UserReportExport({ open, onClose, userData, filters }) {
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState({
    overview: true,
    timeline: true,
    navigation: true,
    actions: true,
    training: true,
    permissions: true,
    comparisons: true
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      // Aqui você implementaria a lógica real de exportação
      // Por exemplo, gerar PDF ou CSV

      const reportData = {
        user: userData.user,
        filters,
        sections: Object.keys(sections).filter(key => sections[key]),
        data: {
          sessions: sections.overview ? userData.sessions : [],
          timeline: sections.timeline ? userData.activityLogs : [],
          navigation: sections.navigation ? userData.activityLogs : [],
          actions: sections.actions ? userData.activityLogs : [],
          training: sections.training ? userData.trainingProgress : [],
          permissions: sections.permissions ? userData.permissions : [],
          comparisons: sections.comparisons ? userData : {}
        }
      };

      // Simular exportação
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Criar blob e download
      const jsonData = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${userData.user.email}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Relatório exportado com sucesso!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-600">
            Selecione as seções que deseja incluir no relatório:
          </p>

          <div className="space-y-3">
            {Object.entries({
              overview: 'Visão Geral',
              timeline: 'Linha do Tempo',
              navigation: 'Mapa de Navegação',
              actions: 'Ações Executadas',
              training: 'Treinamento',
              permissions: 'Permissões',
              comparisons: 'Comparativos'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={key}
                  checked={sections[key]}
                  onCheckedChange={(checked) => 
                    setSections({ ...sections, [key]: checked })
                  }
                />
                <Label htmlFor={key} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={exporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={exporting || !Object.values(sections).some(v => v)}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
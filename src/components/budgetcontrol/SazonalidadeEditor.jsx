import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Save, RotateCcw, Info } from "lucide-react";
import { toast } from "sonner";

const MESES = [
  { num: "01", nome: "Janeiro" },
  { num: "02", nome: "Fevereiro" },
  { num: "03", nome: "Março" },
  { num: "04", nome: "Abril" },
  { num: "05", nome: "Maio" },
  { num: "06", nome: "Junho" },
  { num: "07", nome: "Julho" },
  { num: "08", nome: "Agosto" },
  { num: "09", nome: "Setembro" },
  { num: "10", nome: "Outubro" },
  { num: "11", nome: "Novembro" },
  { num: "12", nome: "Dezembro" }
];

export default function SazonalidadeEditor({ workshopId, onClose }) {
  const [pesos, setPesos] = useState({});
  const [metaAnual, setMetaAnual] = useState(0);
  const queryClient = useQueryClient();

  // Carregar configuração atual
  const { data: configAtual } = useQuery({
    queryKey: ['sazonalidade', workshopId],
    queryFn: async () => {
      const metas = await base44.entities.BudgetMeta.filter({ 
        workshop_id: workshopId,
        mes: new Date().toISOString().slice(0, 7) // mês atual
      });
      
      if (metas.length > 0 && metas[0].sazonalidade_config) {
        setPesos(metas[0].sazonalidade_config);
        setMetaAnual(metas[0].meta_anual_rs || 0);
        return metas[0].sazonalidade_config;
      }
      
      // Default: distribuição igual (8.33% cada)
      const defaultPesos = {};
      MESES.forEach(m => defaultPesos[m.num] = 0.0833);
      return defaultPesos;
    }
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Atualizar todas as metas com a nova sazonalidade
      const meses = await Promise.all(
        MESES.map(async (m) => {
          const metas = await base44.entities.BudgetMeta.filter({
            workshop_id: workshopId,
            mes: `${new Date().getFullYear()}-${m.num}`
          });
          return { mes: m.num, metas };
        })
      );

      // Atualizar cada meta com o peso sazonal
      for (const { mes, metas } of meses) {
        for (const meta of metas) {
          await base44.entities.BudgetMeta.update(meta.id, {
            ...meta,
            peso_sazonal: data.pesos[mes],
            sazonalidade_config: data.pesos,
            meta_fixa_rs: data.metaAnual * data.pesos[mes]
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['budget']);
      toast.success("Sazonalidade salva com sucesso!");
      onClose?.();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  const handlePesoChange = (mes, novoPeso) => {
    setPesos(prev => ({
      ...prev,
      [mes]: parseFloat(novoPeso)
    }));
  };

  const somaPesos = Object.values(pesos).reduce((acc, val) => acc + val, 0);
  const estaValido = Math.abs(somaPesos - 1.00) <= 0.01;

  const handleDistribuirIgual = () => {
    const pesosIguais = {};
    MESES.forEach(m => pesosIguais[m.num] = 0.0833);
    setPesos(pesosIguais);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Distribuição Sazonal</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDistribuirIgual}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Distribuir Igual
          </Button>
          <Button 
            onClick={() => saveMutation.mutate({ pesos, metaAnual })}
            disabled={!estaValido}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A soma dos pesos deve ser exatamente 1.00 (100%). Cada mês representa a porcentagem do faturamento anual esperado.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {MESES.map((mes) => (
          <Card key={mes.num}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                  <Label>{mes.nome}</Label>
                </div>
                <div className="col-span-6">
                  <Slider
                    value={[pesos[mes.num] || 0.0833]}
                    onValueChange={(val) => handlePesoChange(mes.num, val[0])}
                    min={0}
                    max={0.20}
                    step={0.0001}
                    className="w-full"
                  />
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-lg font-bold ${
                    Math.abs(somaPesos - 1.00) > 0.01 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {((pesos[mes.num] || 0.0833) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={estaValido ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Soma dos Pesos</p>
              <p className={`text-2xl font-bold ${estaValido ? 'text-green-600' : 'text-red-600'}`}>
                {(somaPesos * 100).toFixed(2)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`text-lg font-semibold ${estaValido ? 'text-green-600' : 'text-red-600'}`}>
                {estaValido ? "✅ Válido" : "❌ Inválido"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
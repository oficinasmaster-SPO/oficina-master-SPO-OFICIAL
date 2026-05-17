import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Calculator, TrendingUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MetaAnualEditor({ workshopId, ano, item, categoria, tipo, metaAnualExistente, onMetaSalva }) {
  const [metaAnual, setMetaAnual] = useState(metaAnualExistente || "");
  const [distribuirIgualmente, setDistribuirIgualmente] = useState(true);
  const [metasMensais, setMetasMensais] = useState([]);

  const queryClient = useQueryClient();

  // Calcular meta mensal automaticamente
  useEffect(() => {
    if (metaAnual && distribuirIgualmente) {
      const valorMensal = parseFloat(metaAnual) / 12;
      const novasMetas = Array(12).fill().map((_, i) => ({
        mes: `${ano}-${String(i + 1).padStart(2, '0')}`,
        valor: valorMensal
      }));
      setMetasMensais(novasMetas);
    }
  }, [metaAnual, distribuirIgualmente, ano]);

  const sincronizarMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sincronizarMetasAnuais', {
        workshop_id: workshopId,
        ano: parseInt(ano),
        item,
        categoria,
        tipo,
        meta_anual_rs: parseFloat(data.metaAnual),
        distribuicao: data.distribuirIgualmente ? 'igual' : 'personalizada',
        metas_mensais: data.metasMensais
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-meta', workshopId, ano] });
      toast.success("Meta anual sincronizada com sucesso!");
      onMetaSalva?.();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar meta anual: ${error.message}`);
    }
  });

  const handleSalvar = () => {
    if (!metaAnual || parseFloat(metaAnual) <= 0) {
      toast.error("Informe um valor válido para meta anual");
      return;
    }

    sincronizarMutation.mutate({
      metaAnual,
      distribuirIgualmente,
      metasMensais
    });
  };

  const handleMetaMensualChange = (index, valor) => {
    const novasMetas = [...metasMensais];
    novasMetas[index].valor = parseFloat(valor) || 0;
    setMetasMensais(novasMetas);
  };

  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <TrendingUp className="w-5 h-5" />
          Meta Anual - {item}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Meta Anual */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-blue-900">
            Meta Anual (R$)
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                value={metaAnual}
                onChange={(e) => setMetaAnual(e.target.value)}
                className="pl-8 font-semibold"
                placeholder="0,00"
              />
            </div>
            {metaAnual && (
              <div className="text-sm text-blue-700">
                <Calculator className="w-4 h-4 inline mr-1" />
                Mensal: <strong>R$ {(parseFloat(metaAnual) / 12).toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Distribuição */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Distribuir igualmente</p>
            <p className="text-xs text-gray-500">Dividir meta anual por 12 meses</p>
          </div>
          <Switch
            checked={distribuirIgualmente}
            onCheckedChange={setDistribuirIgualmente}
          />
        </div>

        {/* Edição Mês a Mês (quando desativar distribuição igual) */}
        {!distribuirIgualmente && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-blue-900">
              Distribuição Mensal Personalizada
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {metasMensais.map((meta, index) => (
                <div key={meta.mes} className="space-y-1">
                  <Label className="text-xs text-gray-600">{meses[index]}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={meta.valor || ""}
                    onChange={(e) => handleMetaMensualChange(index, e.target.value)}
                    className="h-8 text-xs"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-blue-700 pt-2 border-t border-blue-200">
              <strong>Total: </strong>
              R$ {metasMensais.reduce((sum, m) => sum + (m.valor || 0), 0).toFixed(2)}
              {Math.abs(metasMensais.reduce((sum, m) => sum + (m.valor || 0), 0) - parseFloat(metaAnual)) > 0.01 && (
                <span className="text-red-600 ml-2">
                  ⚠️ Diferente da meta anual (R$ {parseFloat(metaAnual).toFixed(2)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Botão Salvar */}
        <Button
          onClick={handleSalvar}
          disabled={sincronizarMutation.isPending || !metaAnual}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {sincronizarMutation.isPending ? "Salvando..." : "💾 Salvar Meta Anual"}
        </Button>
      </CardContent>
    </Card>
  );
}
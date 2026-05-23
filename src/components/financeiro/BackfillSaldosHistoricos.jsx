import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function BackfillSaldosHistoricos() {
  const { workshop } = useWorkshopContext();
  const [mesInicio, setMesInicio] = useState("2024-01");
  const [mesFim, setMesFim] = useState("2024-12");
  const [dryRun, setDryRun] = useState(true);
  const [resultado, setResultado] = useState(null);

  const mutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke("backfillSaldosHistoricos", {
        workshop_id: workshop.id,
        mes_inicio: params.mesInicio,
        mes_fim: params.mesFim,
        dry_run: params.dryRun
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResultado(data);
    },
    onError: (error) => {
      console.error("Erro no backfill:", error);
      setResultado({ error: error.message });
    }
  });

  const handleExecutar = () => {
    if (!confirm(dryRun 
      ? `Iniciar SIMULAÇÃO do backfill de ${mesInicio} até ${mesFim}?`
      : `⚠️ ATENÇÃO: Executar backfill REAL irá alterar os saldos. Continuar?`
    )) return;

    mutation.mutate({ mesInicio, mesFim, dryRun });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCcw className="w-5 h-5" />
            Backfill: Reprocessar Saldos Históricos
          </CardTitle>
          <CardDescription>
            Recalcula saldos iniciais do DFC com base nas liquidações financeiras registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mês Início</label>
              <Input
                type="month"
                value={mesInicio}
                onChange={(e) => setMesInicio(e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mês Fim</label>
              <Input
                type="month"
                value={mesFim}
                onChange={(e) => setMesFim(e.target.value)}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dryRun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={mutation.isPending}
              className="h-4 w-4"
            />
            <label htmlFor="dryRun" className="text-sm">
              <strong>Modo Simulação</strong> (apenas visualizar, não altera nada)
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExecutar}
              disabled={mutation.isPending || !mesInicio || !mesFim}
              className="gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4" />
                  {dryRun ? "Simular" : "Executar Backfill"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Erro: {resultado?.error || "Erro ao executar backfill"}
          </AlertDescription>
        </Alert>
      )}

      {mutation.isSuccess && resultado?.sucesso && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              {resultado.mensagem}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Processados</p>
                <p className="text-2xl font-bold">{resultado.resultados?.processados}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Alterados</p>
                <p className="text-2xl font-bold">{resultado.resultados?.alterados}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Erros</p>
                <p className="text-2xl font-bold">{resultado.resultados?.erros?.length || 0}</p>
              </div>
            </div>

            {resultado.resultados?.detalhes && resultado.resultados.detalhes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Detalhamento por Mês:</h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {resultado.resultados.detalhes.map((detalhe) => (
                    <div
                      key={detalhe.mes}
                      className={`p-3 rounded-lg border ${
                        detalhe.precisa_alterar
                          ? "bg-amber-50 border-amber-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{detalhe.mes}</span>
                          {detalhe.precisa_alterar ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800">
                              Precisa ajustar
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              OK
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-600">
                          Saldo atual: R$ {detalhe.saldo_inicial_atual?.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Recebimentos:</span>
                          <div className="ml-2">
                            Banco: R$ {detalhe.recebimentos?.banco?.toFixed(2) || 0} |
                            Máquina: R$ {detalhe.recebimentos?.maquina?.toFixed(2) || 0} |
                            Caixa: R$ {detalhe.recebimentos?.caixa?.toFixed(2) || 0}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Pagamentos:</span>
                          <div className="ml-2">
                            Banco: R$ {detalhe.pagamentos?.banco?.toFixed(2) || 0} |
                            Caixa: R$ {detalhe.pagamentos?.caixa?.toFixed(2) || 0}
                          </div>
                        </div>
                      </div>
                      {detalhe.divergencia > 0.01 && (
                        <div className="mt-2 text-sm font-semibold text-amber-700">
                          Divergência: R$ {detalhe.divergencia?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.resultados?.erros?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-red-600">Erros:</h4>
                {resultado.resultados.erros.map((erro, idx) => (
                  <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <strong>{erro.mes}:</strong> {erro.erro}
                  </div>
                ))}
              </div>
            )}

            {!dryRun && resultado.resultados?.alterados > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  💡 <strong>Dica:</strong> Os saldos foram atualizados. Recomenda-se revisar o DFC dos meses alterados para validar as mudanças.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
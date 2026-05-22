import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function CorrigirParcelasDuplicadas() {
  const { workshop } = useWorkshopContext();
  const { user } = useAuth();
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const handleCorrigir = async () => {
    if (!workshop?.id) {
      toast.error("Selecione uma oficina");
      return;
    }

    setExecutando(true);
    setErro(null);
    setResultado(null);

    try {
      const response = await base44.functions.invoke("corrigirParcelasDuplicadas", {
        workshop_id: workshop.id
      });

      setResultado(response.data);
      toast.success("Correção realizada com sucesso!");
    } catch (error) {
      console.error("Erro:", error);
      setErro(error.message || "Erro ao executar correção");
      toast.error("Erro ao corrigir: " + (error.message || "Erro desconhecido"));
    } finally {
      setExecutando(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar esta ferramenta.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Corrigir Parcelas Duplicadas</h1>
        <p className="text-gray-600">
          Redistribui automaticamente parcelas recorrentes pelos meses corretos
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Database className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>O que esta ferramenta faz:</strong> Identifica lançamentos com mesma descrição, valor e data de vencimento,
          mantém um para o mês original e redistribui os demais pelos meses subsequentes (junho, julho, agosto... até completar as parcelas).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Oficina Selecionada</CardTitle>
          <CardDescription>{workshop?.name || "Nenhuma oficina selecionada"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCorrigir} 
            disabled={executando || !workshop?.id}
            className="w-full"
            size="lg"
          >
            {executando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Corrigindo lançamentos...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Executar Correção Automática
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {resultado && (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">✓ Correção Concluída</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-green-700">Total de Lançamentos</p>
                  <p className="text-2xl font-bold text-green-900">{resultado.resumo.total_lancamentos}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Grupos Processados</p>
                  <p className="text-2xl font-bold text-green-900">{resultado.resumo.grupos_processados}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Mantidos (Original)</p>
                  <p className="text-2xl font-bold text-green-900">{resultado.resumo.mantidos}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Atualizados (Redistribuídos)</p>
                  <p className="text-2xl font-bold text-green-900">{resultado.resumo.atualizados}</p>
                </div>
              </div>
              {resultado.resumo.erros > 0 && (
                <p className="text-sm text-red-600 mt-2">⚠️ {resultado.resumo.erros} erro(s) na execução</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento das Correções</CardTitle>
              <CardDescription>
                {resultado.correcoes?.length} lançamentos processados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {resultado.correcoes?.slice(0, 50).map((correcao, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      correcao.acao === 'mantido' 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{correcao.descricao}</p>
                        {correcao.acao === 'mantido' ? (
                          <p className="text-xs text-blue-700 mt-1">
                            ✓ Mantido em {correcao.data_vencimento} ({correcao.mes})
                          </p>
                        ) : (
                          <p className="text-xs text-green-700 mt-1">
                            → Parcela {correcao.parcela_atual}: {correcao.data_vencimento_antiga} → {correcao.data_vencimento_nova} ({correcao.mes_novo})
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-500">{correcao.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
                {resultado.correcoes?.length > 50 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    ... e mais {resultado.correcoes.length - 50} correções
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {resultado.erros?.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900">⚠️ Erros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resultado.erros.map((erro, idx) => (
                    <div key={idx} className="p-2 bg-red-100 rounded text-sm text-red-800">
                      <strong>{erro.descricao}</strong>: {erro.erro}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
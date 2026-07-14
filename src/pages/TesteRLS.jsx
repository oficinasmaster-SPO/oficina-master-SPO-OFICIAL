import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TEMPORARIO - remover após validação da migração de tenant.
export default function TesteRLS() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const executarTeste = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await base44.functions.invoke("rlsRealPerspectiveTest", {});
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Não foi possível executar o teste.");
    } finally {
      setLoading(false);
    }
  };

  const temVazamento = Number(result?.resumo?.entidades_com_vazamento || 0) > 0;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <Card className="mx-auto max-w-5xl">
        <CardHeader><CardTitle>Teste de perspectiva RLS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={executarTeste} disabled={loading}>
            {loading ? "Executando..." : "Executar teste RLS"}
          </Button>
          {error && <p className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</p>}
          {result && (
            <pre className={`max-h-[70vh] overflow-auto rounded-md border p-4 text-xs ${temVazamento ? "border-destructive bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LOTES = [
  { value: "completo", label: "Completo (todas as entidades)" },
  { value: "financeiro", label: "Financeiro" },
  { value: "crm_agenda", label: "CRM / Agenda" },
  { value: "operacional", label: "Operacional" },
];

// TEMPORARIO - remover após validação da migração de tenant.
export default function TesteRLS() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lote, setLote] = useState("completo");

  const executarTeste = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await base44.functions.invoke("rlsRealPerspectiveTest", { lote });
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
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="lote">Lote de entidades</Label>
            <Select value={lote} onValueChange={setLote} disabled={loading}>
              <SelectTrigger id="lote">
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {LOTES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
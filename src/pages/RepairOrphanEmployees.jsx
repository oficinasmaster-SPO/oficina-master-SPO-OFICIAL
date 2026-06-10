import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RepairOrphanEmployees() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke("repairOrphanEmployees", {});
      setResults(res.data);
    } catch (e) {
      setResults({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Repair Orphan Employees</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Envia convite para os 4 colaboradores órfãos e vincula o novo user_id ao Employee existente.
      </p>

      <Button onClick={handleRun} disabled={loading} className="mb-6">
        {loading ? "Executando..." : "Executar Reparo"}
      </Button>

      {results && (
        <div className="space-y-3">
          {results.error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
              Erro: {results.error}
            </div>
          )}
          {results.results?.map((r, i) => (
            <div key={i} className="border rounded p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-gray-500">{r.email}</p>
                {r.success && (
                  <p className="text-xs text-green-600 mt-1">
                    new_user_id: {r.new_user_id}
                  </p>
                )}
                {!r.success && (
                  <p className="text-xs text-red-500 mt-1">{r.error}</p>
                )}
              </div>
              <Badge className={r.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {r.success ? "✅ OK" : "❌ Falhou"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
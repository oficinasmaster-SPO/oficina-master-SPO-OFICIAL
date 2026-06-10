import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TARGETS = [
  { label: 'Fernando', email: 'fhferreiralima@gmail.com',     employee_id: '69b0560521b754dde545675b', workshop_id: '69a1ec60d068410bf044e52d' },
  { label: 'Iago',     email: 'administracao@p1pneus.com.br', employee_id: '69ab049d77e0401717299da2', workshop_id: '69ab0437' },
  { label: 'Clecio',   email: 'cleciocristiane0@gmail.com',   employee_id: '69a1b376a66f7f7813d6b527', workshop_id: '697b9828' },
  { label: 'Yago',     email: 'oficinadoyago39@gmail.com',    employee_id: '69a1ad791b2c27519123d8a2', workshop_id: '697b9828' },
];

export default function RepairOrphanEmployees() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleRun = async () => {
    setLoading(true);
    setResults(null);
    setLog([]);
    const out = [];

    for (const { label, email, employee_id, workshop_id } of TARGETS) {
      try {
        addLog(`[${label}] Convidando ${email}...`);

        // Invite via frontend SDK (token do admin autenticado)
        const inviteResult = await base44.users.inviteUser(email, 'user');
        addLog(`[${label}] inviteUser retornou: ${JSON.stringify(inviteResult)}`);

        const newUserId = inviteResult?.id || inviteResult?.user_id || inviteResult?.userId;

        if (!newUserId) {
          out.push({ label, email, success: false, error: `Sem user_id na resposta: ${JSON.stringify(inviteResult)}` });
          continue;
        }

        addLog(`[${label}] new_user_id=${newUserId} — vinculando ao Employee...`);

        // Atualizar Employee via backend service role
        const linkRes = await base44.functions.invoke("repairLinkEmployeeToUser", {
          employee_id,
          user_id: newUserId,
          workshop_id,
        });

        addLog(`[${label}] link result: ${JSON.stringify(linkRes?.data)}`);
        out.push({ label, email, success: true, new_user_id: newUserId, employee_id });

      } catch (e) {
        addLog(`[${label}] ERRO: ${e.message}`);
        out.push({ label, email, success: false, error: e.message });
      }
    }

    setResults(out);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Repair Orphan Employees</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Re-convida os 4 colaboradores órfãos e vincula o novo user_id ao Employee existente.
      </p>

      <Button onClick={handleRun} disabled={loading} className="mb-6">
        {loading ? "Executando..." : "Executar Reparo"}
      </Button>

      {results && (
        <div className="space-y-3 mb-6">
          {results.map((r, i) => (
            <div key={i} className="border rounded p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-gray-500">{r.email}</p>
                {r.success && (
                  <p className="text-xs text-green-600 mt-1">new_user_id: {r.new_user_id}</p>
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

      {log.length > 0 && (
        <div className="bg-gray-900 text-green-400 rounded p-4 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TARGETS = [
  { label: 'Fernando', email: 'fhferreiralima@gmail.com',     employee_id: '69b0560521b754dde545675b', workshop_id: '69a1ec60d068410bf044e52d', invite_token: null },
  { label: 'Iago',     email: 'administracao@p1pneus.com.br', employee_id: '69ab049d77e0401717299da2', workshop_id: '69ab04376ca4c22324455582', invite_token: 'repair-iago-2026' },
  { label: 'Clecio',   email: 'cleciocristiane0@gmail.com',   employee_id: '69a1b376a66f7f7813d6b527', workshop_id: '697b9828395f2d23c1811f87', invite_token: null },
  { label: 'Yago',     email: 'oficinadoyago39@gmail.com',    employee_id: '69a1ad791b2c27519123d8a2', workshop_id: '697b9828395f2d23c1811f87', invite_token: null },
];

export default function RepairOrphanEmployees() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Etapa 1: Força vinculação direta via service role (admin cria EmployeeInviteAcceptance manualmente)
  const handleForceLink = async () => {
    setLoading(true);
    setResults(null);
    setLog([]);
    const out = [];

    for (const { label, email, employee_id, workshop_id } of TARGETS) {
      try {
        addLog(`[${label}] Buscando usuário por email...`);

        // Tentar achar User pelo email
        const users = await base44.entities.User.filter({ email });
        
        if (users.length === 0) {
          addLog(`[${label}] ⚠️ Usuário ainda não aceitou o convite — pulando`);
          out.push({ label, email, success: false, error: 'Usuário ainda não cadastrado na plataforma' });
          continue;
        }

        const user = users[0];
        addLog(`[${label}] ✅ Usuário encontrado: ${user.id}`);

        // Atualizar Employee diretamente
        await base44.entities.Employee.update(employee_id, {
          user_id: user.id,
          user_status: 'ativo',
        });

        // Atualizar User com workshop_id
        await base44.entities.User.update(user.id, { workshop_id });

        addLog(`[${label}] ✅ Vinculado com sucesso`);
        out.push({ label, email, success: true, new_user_id: user.id });

      } catch (e) {
        addLog(`[${label}] ❌ ERRO: ${e.message}`);
        out.push({ label, email, success: false, error: e.message });
      }
    }

    setResults(out);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Repair Orphan Employees</h1>
      <p className="text-gray-500 mb-2 text-sm">
        Vincula os 4 colaboradores órfãos ao seu user_id real após aceitarem o convite.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-6 text-sm text-amber-800">
        <p className="font-semibold mb-1">📧 Convites já enviados</p>
        <p>Os emails de convite foram disparados. Aguarde os colaboradores aceitarem e fazerem login. Em seguida, clique no botão abaixo para vincular automaticamente.</p>
      </div>

      <Button onClick={handleForceLink} disabled={loading} className="mb-6">
        {loading ? "Verificando e vinculando..." : "Verificar e Vincular Agora"}
      </Button>

      {results && (
        <div className="space-y-3 mb-6">
          {results.map((r, i) => (
            <div key={i} className="border rounded p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-gray-500">{r.email}</p>
                {r.success && <p className="text-xs text-green-600 mt-1">user_id: {r.new_user_id}</p>}
                {!r.success && <p className="text-xs text-red-500 mt-1">{r.error}</p>}
              </div>
              <Badge className={r.success ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {r.success ? "✅ Vinculado" : "⏳ Pendente"}
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
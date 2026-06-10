import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TARGETS = [
  { label: 'Fernando', email: 'fhferreiralima@gmail.com',     employee_id: '69b0560521b754dde545675b', workshop_id: '69a1ec60d068410bf044e52d' },
  { label: 'Iago',     email: 'administracao@p1pneus.com.br', employee_id: '69ab049d77e0401717299da2', workshop_id: '69ab04376ca4c22324455582' },
  { label: 'Clecio',   email: 'cleciocristiane0@gmail.com',   employee_id: '69a1b376a66f7f7813d6b527', workshop_id: '697b9828395f2d23c1811f87' },
  { label: 'Yago',     email: 'oficinadoyago39@gmail.com',    employee_id: '69a1ad791b2c27519123d8a2', workshop_id: '697b9828395f2d23c1811f87' },
];

export default function RepairOrphanEmployees() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState(null);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleResendInvites = async () => {
    setInviteLoading(true);
    setInviteResults(null);
    const out = [];
    for (const { label, email } of TARGETS) {
      try {
        await base44.users.inviteUser(email, 'user');
        out.push({ label, email, sent: true });
      } catch (e) {
        out.push({ label, email, sent: false, error: e.message });
      }
    }
    setInviteResults(out);
    setInviteLoading(false);
  };

  const handleForceLink = async () => {
    setLoading(true);
    setResults(null);
    setLog([]);
    const out = [];

    for (const { label, email, employee_id, workshop_id } of TARGETS) {
      addLog(`[${label}] Buscando usuário por email...`);
      const users = await base44.entities.User.filter({ email });

      if (users.length === 0) {
        addLog(`[${label}] ⚠️ Usuário ainda não aceitou o convite`);
        out.push({ label, email, success: false, error: 'Usuário ainda não cadastrado na plataforma' });
        continue;
      }

      const user = users[0];
      addLog(`[${label}] ✅ Usuário encontrado: ${user.id}`);

      await base44.entities.Employee.update(employee_id, { user_id: user.id, user_status: 'ativo' });
      await base44.entities.User.update(user.id, { workshop_id });

      addLog(`[${label}] ✅ Vinculado com sucesso`);
      out.push({ label, email, success: true, new_user_id: user.id });
    }

    setResults(out);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Repair Orphan Employees</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Vincula os colaboradores órfãos ao seu user_id após aceitarem o convite de email.
      </p>

      {/* Step 1 */}
      <div className="border rounded p-4 mb-4">
        <p className="font-semibold mb-1">Passo 1 — Reenviar convites por email</p>
        <p className="text-sm text-gray-500 mb-3">Envia (ou reenvia) o email de convite para os 4 colaboradores.</p>
        <Button variant="outline" onClick={handleResendInvites} disabled={inviteLoading}>
          {inviteLoading ? "Enviando..." : "📧 Reenviar Convites"}
        </Button>
        {inviteResults && (
          <ul className="mt-3 space-y-1 text-sm">
            {inviteResults.map((r, i) => (
              <li key={i} className={r.sent ? "text-green-600" : "text-red-500"}>
                {r.sent ? "✅" : "❌"} {r.label} — {r.email} {r.error ? `(${r.error})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Step 2 */}
      <div className="border rounded p-4 mb-6">
        <p className="font-semibold mb-1">Passo 2 — Vincular após aceitar</p>
        <p className="text-sm text-gray-500 mb-3">Após cada colaborador aceitar o convite e criar senha, clique para vincular.</p>
        <Button onClick={handleForceLink} disabled={loading}>
          {loading ? "Verificando e vinculando..." : "Verificar e Vincular Agora"}
        </Button>
      </div>

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
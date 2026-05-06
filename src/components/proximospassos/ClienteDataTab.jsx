import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, Mail, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

function ContactCard({ person, role }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-gray-500 text-xs">Nome</p>
        <p className="font-medium text-sm">{person.full_name}</p>
      </div>
      {role && (
        <div>
          <p className="text-gray-500 text-xs">Cargo</p>
          <p className="text-sm">{role}</p>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {person.telefone && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-7 px-2"
            onClick={() => window.location.href = `tel:${person.telefone}`}
          >
            <Phone className="w-3 h-3" />
            {person.telefone}
          </Button>
        )}
        {person.email && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-7 px-2"
            onClick={() => window.location.href = `mailto:${person.email}`}
          >
            <Mail className="w-3 h-3" />
            Email
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClienteDataTab({ passo }) {
  const [subTab, setSubTab] = useState("empresa");
  const [workshop, setWorkshop] = useState(null);
  const [socios, setSocios] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!passo.workshop_id) {
          setLoading(false);
          return;
        }

        // Buscar workshop
        const ws = await base44.entities.Workshop.get(passo.workshop_id);
        setWorkshop(ws);

        // Buscar todos os colaboradores da oficina
        const allEmployees = await base44.entities.Employee.filter(
          { workshop_id: passo.workshop_id },
          "-created_date",
          100
        );

        // Separar sócios e funcionários
        const sociosData = allEmployees.filter(e => e.is_partner);
        const funcionariosData = allEmployees.filter(e => !e.is_partner);

        setSocios(sociosData);
        setFuncionarios(funcionariosData);
      } catch (err) {
        console.warn('Erro ao buscar dados de cliente:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [passo.workshop_id]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subabas */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "empresa", label: "Empresa", icon: "🏢" },
          { id: "socios", label: "Sócios", icon: "👥", count: socios.length },
          { id: "funcionarios", label: "Funcionários", icon: "👨‍💼", count: funcionarios.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`text-xs font-medium px-3 py-2 border-b-2 transition-colors ${
              subTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label} {tab.count !== undefined && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Conteúdo das Subabas */}
      {subTab === "empresa" && workshop && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Nome</p>
            <p className="font-semibold text-gray-900">{workshop.name}</p>
          </div>

          {workshop.segment && (
            <div>
              <p className="text-gray-500 text-xs mb-1">Segmento</p>
              <p className="text-sm text-gray-700">{workshop.segment}</p>
            </div>
          )}

          {workshop.endereco_completo && (
            <div>
              <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Endereço
              </p>
              <p className="text-sm text-gray-700">{workshop.endereco_completo}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {workshop.telefone && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => window.location.href = `tel:${workshop.telefone}`}
              >
                <Phone className="w-3.5 h-3.5" /> {workshop.telefone}
              </Button>
            )}
            {workshop.email && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => window.location.href = `mailto:${workshop.email}`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            )}
          </div>
        </div>
      )}

      {subTab === "socios" && (
        <div className="space-y-3">
          {socios.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nenhum sócio cadastrado</p>
          ) : (
            socios.map(socio => (
              <ContactCard key={socio.id} person={socio} role={socio.position} />
            ))
          )}
        </div>
      )}

      {subTab === "funcionarios" && (
        <div className="space-y-3">
          {funcionarios.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nenhum funcionário cadastrado</p>
          ) : (
            funcionarios.map(func => (
              <ContactCard key={func.id} person={func} role={func.position} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClienteDataTab({ passo }) {
  const [workshop, setWorkshop] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (passo.workshop_id) {
          const ws = await base44.entities.Workshop.get(passo.workshop_id);
          setWorkshop(ws);
          
          if (ws.owner_id) {
            const emp = await base44.entities.Employee.get(ws.owner_id);
            setOwner(emp);
          }
        }
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
        {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card da Empresa */}
      {workshop && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📍 Empresa</h3>
          
          <div className="space-y-2 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">Nome</p>
              <p className="font-medium">{workshop.name}</p>
            </div>
            {workshop.segment && (
              <div>
                <p className="text-gray-500 text-xs">Segmento</p>
                <p className="font-medium">{workshop.segment}</p>
              </div>
            )}
            {workshop.endereco_completo && (
              <div>
                <p className="text-gray-500 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Endereço
                </p>
                <p className="font-medium text-xs">{workshop.endereco_completo}</p>
              </div>
            )}
          </div>
          
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
      
      {/* Card do Responsável/Owner */}
      {owner && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">👤 Responsável</h3>
          
          <div className="space-y-2 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">Nome</p>
              <p className="font-medium">{owner.full_name}</p>
            </div>
            {owner.email && (
              <div>
                <p className="text-gray-500 text-xs">Email</p>
                <a href={`mailto:${owner.email}`} className="text-blue-600 font-medium text-xs hover:underline">
                  {owner.email}
                </a>
              </div>
            )}
            {owner.telefone && (
              <div>
                <p className="text-gray-500 text-xs">Telefone</p>
                <a href={`tel:${owner.telefone}`} className="text-blue-600 font-medium text-xs hover:underline">
                  {owner.telefone}
                </a>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {owner.telefone && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => window.location.href = `tel:${owner.telefone}`}
              >
                <Phone className="w-3.5 h-3.5" /> Ligar
              </Button>
            )}
            {owner.email && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => window.location.href = `mailto:${owner.email}`}
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            )}
          </div>
        </div>
      )}

      {!workshop && !loading && (
        <p className="text-center text-gray-400 text-sm py-8">Nenhum dado de cliente disponível</p>
      )}
    </div>
  );
}
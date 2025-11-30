import React from 'react';
import { useAdminSession } from '@/context/AdminSessionContext';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function AdminBanner() {
  const { session, endSession } = useAdminSession();

  if (!session) return null;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-purple-900 text-white px-4 py-2 flex items-center justify-between shadow-md print:hidden relative z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></span>
          <span className="font-bold text-sm uppercase tracking-wider">Sessão MASTER Ativa</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-purple-100 border-l border-purple-700 pl-4">
          <span>Oficina: <strong>{session.workshopName || session.workshop_id}</strong></span>
          <span>•</span>
          <span>Expira às {formatTime(session.expires_at)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('GestaoOficina')}>
           <Button size="sm" variant="ghost" className="text-purple-100 hover:text-white hover:bg-purple-800 h-8 text-xs">
             <ExternalLink className="w-3 h-3 mr-2" />
             Ir para Oficina
           </Button>
        </Link>
        <Button 
          size="sm" 
          variant="destructive" 
          className="h-8 text-xs bg-red-600 hover:bg-red-700"
          onClick={() => endSession()}
        >
          <X className="w-3 h-3 mr-2" />
          Encerrar Sessão
        </Button>
      </div>
    </div>
  );
}
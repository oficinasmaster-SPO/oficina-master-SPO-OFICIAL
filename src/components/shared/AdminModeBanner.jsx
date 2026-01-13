import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X } from 'lucide-react';
import { useAdminMode } from '@/components/hooks/useAdminMode';

export default function AdminModeBanner({ workshop }) {
  const { isAdminMode, exitAdminMode } = useAdminMode();

  if (!isAdminMode || !workshop) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 print:hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          <div className="flex items-center gap-3">
            <span className="font-semibold">MODO ADMINISTRADOR</span>
            <Badge className="bg-white/20 text-white border-white/30">
              Visualizando: {workshop.name}
            </Badge>
            <span className="text-sm opacity-90">
              {workshop.city}/{workshop.state}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={exitAdminMode}
          className="text-white hover:bg-white/20"
        >
          <X className="w-4 h-4 mr-2" />
          Sair do Modo Admin
        </Button>
      </div>
    </div>
  );
}
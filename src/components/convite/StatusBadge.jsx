import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function StatusBadge({ status, expiresAt }) {
  const now = new Date();
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  
  // Determinar status real
  let displayStatus = status || 'pendente';
  
  if (status === 'concluido') {
    displayStatus = 'aceito';
  } else if (expiryDate && expiryDate < now && status !== 'concluido') {
    displayStatus = 'expirado';
  }

  const statusConfig = {
    pendente: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Pendente',
      className: 'bg-gray-100 text-gray-800'
    },
    enviado: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Enviado',
      className: 'bg-blue-100 text-blue-800'
    },
    aceito: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Aceito',
      className: 'bg-green-100 text-green-800'
    },
    concluido: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Aceito',
      className: 'bg-green-100 text-green-800'
    },
    expirado: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Expirado',
      className: 'bg-red-100 text-red-800'
    }
  };

  const config = statusConfig[displayStatus] || statusConfig.pendente;

  return (
    <Badge className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
import React from 'react';
import { useAccessControl } from '../hooks/useAccessControl';
import { Card, CardContent } from '../ui/card';
import { ShieldAlert } from 'lucide-react';

export default function RestrictedAccess({ allowedRoles = [], children, fallback }) {
  const { hasAccess } = useAccessControl(allowedRoles);
  
  if (hasAccess) return <>{children}</>;
  
  if (fallback) return <>{fallback}</>;
  
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-red-200 bg-red-50">
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Acesso Restrito</h2>
          <p className="text-red-700">Você não tem permissão para acessar esta página ou recurso.</p>
        </CardContent>
      </Card>
    </div>
  );
}
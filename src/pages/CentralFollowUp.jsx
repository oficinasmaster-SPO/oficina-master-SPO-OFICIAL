import React from 'react';
import FollowUpsTab from '@/components/aceleracao/FollowUpsTab';

export default function CentralFollowUp() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Central de Follow-up</h1>
        <p className="text-gray-600 mt-2">
          Gerencie e acompanhe todos os follow-ups dos clientes em aceleração
        </p>
      </div>

      <FollowUpsTab />
    </div>
  );
}
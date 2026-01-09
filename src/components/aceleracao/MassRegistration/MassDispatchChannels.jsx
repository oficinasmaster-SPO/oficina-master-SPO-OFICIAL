import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Bell } from "lucide-react";

export default function MassDispatchChannels({ value, onChange }) {
  const channels = [
    { id: "email", label: "E-mail", icon: Mail, description: "Enviar para e-mail registrado" },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, description: "Enviar para WhatsApp" },
    { id: "notification", label: "Notificação", icon: Bell, description: "Criar notificação in-app" }
  ];

  const toggleChannel = (id) => {
    const updated = value.includes(id) ? value.filter(c => c !== id) : [...value, id];
    onChange(updated);
  };

  return (
    <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
      <p className="font-semibold text-sm text-blue-900">Canais de Entrega</p>
      <div className="space-y-2">
        {channels.map(channel => {
          const Icon = channel.icon;
          return (
            <div key={channel.id} className="flex items-start gap-3">
              <Checkbox
                id={channel.id}
                checked={value.includes(channel.id)}
                onCheckedChange={() => toggleChannel(channel.id)}
              />
              <div className="flex-1 flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 text-gray-600" />
                <div>
                  <Label htmlFor={channel.id} className="text-sm font-medium cursor-pointer">
                    {channel.label}
                  </Label>
                  <p className="text-xs text-gray-600">{channel.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
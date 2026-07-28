import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Send as SendIcon, Users } from "lucide-react";

const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos", icon: Users },
  { key: "para_mim",     label: "Para mim",         icon: Inbox },
  { key: "meus_pedidos", label: "Meus pedidos",     icon: SendIcon },
];

export default function ScopeSelector({ value, onChange }) {
  const current = SCOPE_OPTIONS.find(o => o.key === value) || SCOPE_OPTIONS[0];
  const Icon = current.icon;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[160px] bg-white border-gray-200 shadow-sm text-[12.5px] font-medium text-gray-700">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gray-500" />
          <span>{current.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {SCOPE_OPTIONS.map(opt => (
          <SelectItem key={opt.key} value={opt.key} className="text-[12.5px]">{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
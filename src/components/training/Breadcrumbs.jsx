import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TrainingBreadcrumbs({ items }) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600 mb-4">
      <button
        onClick={() => navigate(createPageUrl("GerenciarTreinamentos"))}
        className="hover:text-slate-900 transition-colors flex items-center gap-1"
      >
        <Home className="w-4 h-4" />
        Treinamentos
      </button>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4" />
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
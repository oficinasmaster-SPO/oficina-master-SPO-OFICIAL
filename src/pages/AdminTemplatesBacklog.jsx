import React from "react";
import TemplateBacklogManager from "@/components/aceleracao/TemplateBacklogManager";

export default function AdminTemplatesBacklog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates de Tarefas</h1>
        <p className="text-gray-600 mt-1">
          Crie e gerencie templates padrão para agilizar a criação de tarefas no backlog
        </p>
      </div>
      <TemplateBacklogManager />
    </div>
  );
}
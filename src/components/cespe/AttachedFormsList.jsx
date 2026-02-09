import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, Circle } from "lucide-react";

const formTypeColors = {
  lead_score: "bg-green-100 text-green-800",
  tecnico: "bg-blue-100 text-blue-800",
  comportamental: "bg-purple-100 text-purple-800",
  cultural: "bg-orange-100 text-orange-800",
  custom: "bg-gray-100 text-gray-800"
};

export default function AttachedFormsList({ 
  attachedForms, 
  onRemove, 
  onSelectForm,
  currentFormId 
}) {
  if (!attachedForms || attachedForms.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardContent className="pt-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">
          Formulários Anexados ({attachedForms.length})
        </h3>
        <div className="space-y-2">
          {attachedForms.map((form, index) => (
            <div
              key={form.form_id || index}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                currentFormId === form.form_id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {form.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={formTypeColors[form.form_type] || formTypeColors.custom}>
                      {form.is_lead_score ? 'Lead Score' : form.form_type}
                    </Badge>
                    {form.completed && (
                      <span className="text-xs text-green-600 font-medium">Respondido</span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{form.form_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!form.completed && (
                  <Button
                    size="sm"
                    variant={currentFormId === form.form_id ? "default" : "outline"}
                    onClick={() => onSelectForm(form)}
                  >
                    {currentFormId === form.form_id ? 'Respondendo' : 'Responder'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(form.form_id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
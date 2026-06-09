import React from "react";
import { motion } from "framer-motion";
import { Loader2, Lightbulb, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ProfileSuggestionBanner({ 
  profileSuggestion, 
  checkingSuggestion, 
  job_role,
  onApplySuggestion,
  onDismiss 
}) {
  if (checkingSuggestion) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando sugestão...
      </div>
    );
  }

  if (!profileSuggestion || !profileSuggestion.has_suggestion) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md"
    >
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-900">Sugestão de Perfil</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Para o cargo <strong>{job_role}</strong>, sugerimos: <strong>{profileSuggestion.suggested_profile_name}</strong>
          </p>
          <div className="flex gap-2 mt-2">
            <Button 
              type="button" 
              size="sm" 
              variant="outline"
              className="h-7 text-xs bg-white hover:bg-blue-100 border-blue-300"
              onClick={() => {
                onApplySuggestion(profileSuggestion.suggested_profile_id);
                toast.success("Perfil sugerido aplicado!");
              }}
            >
              <Check className="w-3 h-3 mr-1" />
              Usar este perfil
            </Button>
            <Button 
              type="button" 
              size="sm" 
              variant="ghost"
              className="h-7 text-xs text-blue-600 hover:text-blue-800"
              onClick={onDismiss}
            >
              <X className="w-3 h-3 mr-1" />
              Escolher outro
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
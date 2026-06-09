import React from "react";
import { motion } from "framer-motion";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// FASE 4: Banner simplificado - perfil já foi aplicado automaticamente
export default function ProfileSuggestionBanner({ 
  profileSuggestion, 
  checkingSuggestion, 
  job_role,
  onDismiss 
}) {
  if (checkingSuggestion) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando perfil canônico...
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
      className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md"
    >
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Check className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-green-900">Perfil Sugerido Automaticamente</p>
          <p className="text-xs text-green-700 mt-0.5">
            Cargo <strong>{job_role}</strong> → <strong>{profileSuggestion.suggested_profile_name}</strong>
          </p>
          <p className="text-xs text-green-600 mt-1">
            Você pode alterar manualmente se necessário.
          </p>
          <div className="mt-2">
            <Button 
              type="button" 
              size="sm" 
              variant="ghost"
              className="h-7 text-xs text-green-700 hover:text-green-900"
              onClick={onDismiss}
            >
              <X className="w-3 h-3 mr-1" />
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
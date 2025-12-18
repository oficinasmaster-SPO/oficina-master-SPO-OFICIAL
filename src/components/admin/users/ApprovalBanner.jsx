import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, User } from "lucide-react";

export default function ApprovalBanner({ user, onApprove, isApproving }) {
  if (!user || user.user_status !== 'pending') return null;

  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-4">
      <Clock className="w-4 h-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-sm text-yellow-800">
          <p className="font-semibold">⏳ Usuário Aguardando Aprovação</p>
          <p className="mt-1">
            Este usuário completou o cadastro mas ainda não teve o acesso liberado pelo administrador.
          </p>
        </div>
        <Button
          onClick={onApprove}
          disabled={isApproving}
          className="bg-green-600 hover:bg-green-700 ml-4 whitespace-nowrap"
          size="sm"
        >
          {isApproving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Aprovando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar Acesso
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
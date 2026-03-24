import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function RestrictedAccess({ message }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-slate-50 p-4 rounded-xl">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200 text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-slate-500" />
          </div>
          <CardTitle className="text-xl">Acesso Restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base mb-6 text-slate-600">
            {message || "Esta área é exclusiva para sócios, diretores e lideranças. Fale com seu gestor para solicitar acesso."}
          </CardDescription>
          <Link to={createPageUrl("Home")}>
            <Button className="w-full bg-slate-900 hover:bg-slate-800">
              Voltar para a Tela Inicial
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
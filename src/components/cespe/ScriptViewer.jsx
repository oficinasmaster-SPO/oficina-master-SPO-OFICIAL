import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function ScriptViewer({ open, onClose, script, workshop }) {
  if (!script) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Script de Venda do Sonho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header com info da empresa */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{workshop?.name || "Empresa"}</h2>
            <p className="text-sm text-gray-600">{workshop?.segment || workshop?.segment_auto || "Automotiva"}</p>
          </div>

          {/* Missão */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-600">Missão</Badge>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {script.mission}
              </p>
            </CardContent>
          </Card>

          {/* Visão */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-purple-600">Visão</Badge>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {script.vision}
              </p>
            </CardContent>
          </Card>

          {/* Valores */}
          {script.values?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-green-600">Valores</Badge>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {script.values.map((value, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-lg">{value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* História da Empresa */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-amber-600">Nossa História</Badge>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {script.company_history}
              </p>
            </CardContent>
          </Card>

          {/* Oportunidades de Crescimento */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-emerald-600">Oportunidades de Crescimento</Badge>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {script.growth_opportunities}
              </p>
            </CardContent>
          </Card>

          {/* Perfil que NÃO se Adapta */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-600">Perfil que NÃO se Adapta</Badge>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                {script.not_fit_profile}
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
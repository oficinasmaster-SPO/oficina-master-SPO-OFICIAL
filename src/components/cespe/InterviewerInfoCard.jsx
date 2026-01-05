import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User, Briefcase, Building2 } from "lucide-react";

/**
 * Card exibindo informações do entrevistador
 */
export default function InterviewerInfoCard({ interviewer }) {
  if (!interviewer) return null;

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">Entrevistador</p>
            <p className="font-semibold text-gray-900">{interviewer.name || "N/A"}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {interviewer.position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {interviewer.position}
                </span>
              )}
              {interviewer.area && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {interviewer.area}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
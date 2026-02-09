import React from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LessonContextBar({ course, module, lesson }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
        <button
          onClick={() => navigate(createPageUrl('AcademiaTreinamento'))}
          className="hover:text-blue-600 transition-colors"
        >
          Academia
        </button>
        <ChevronRight className="w-4 h-4" />
        <button
          onClick={() => navigate(`${createPageUrl('AssistirCurso')}?course_id=${course?.id}`)}
          className="hover:text-blue-600 transition-colors font-medium"
        >
          {course?.title}
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{module?.title}</span>
        <ChevronRight className="w-4 h-4" />
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {lesson?.title}
        </Badge>
      </div>
    </div>
  );
}
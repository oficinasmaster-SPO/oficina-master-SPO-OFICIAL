import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConsumeCourseCard({ 
  course, 
  progress, 
  onClick, 
  showProgress = false 
}) {
  const coverImage = course.cover_images?.[0];
  const hasProgress = progress?.has_progress;
  const progressPercentage = progress?.progress_percentage || 0;

  return (
    <Card 
      className="group cursor-pointer transition-all hover:scale-105 hover:shadow-xl overflow-hidden bg-zinc-900 border-zinc-800"
      onClick={() => onClick?.(course)}
    >
      {/* Cover Image */}
      <div className="relative h-44 bg-zinc-800">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={course.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <BookOpen className="w-12 h-12 text-zinc-600" />
          </div>
        )}

        {/* Play Overlay on Hover */}
        <div className={cn(
          "absolute inset-0 bg-black/60 flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-7 h-7 text-black fill-current ml-1" />
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2">
            <Progress value={progressPercentage} className="h-1" />
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 space-y-2">
        <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
          {course.title}
        </h3>

        <p className="text-xs text-zinc-400 line-clamp-2">
          {course.description || "Aprenda com este curso"}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {course.category && (
            <Badge className="bg-zinc-800 text-zinc-300 text-xs capitalize">
              {course.category}
            </Badge>
          )}
          {course.total_duration_minutes > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="w-3 h-3" />
              {Math.floor(course.total_duration_minutes / 60)}h {course.total_duration_minutes % 60}min
            </div>
          )}
        </div>

        {showProgress && hasProgress && (
          <div className="text-xs text-zinc-400 pt-1">
            {progressPercentage}% concluído
          </div>
        )}
      </CardContent>
    </Card>
  );
}
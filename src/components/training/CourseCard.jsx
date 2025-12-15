import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, CheckCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CourseCard({ 
  course, 
  progress, 
  onClick, 
  showProgress = true,
  size = "default" 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const videoRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    // Autoplay trailer após 1.5s de hover
    if (course.trailer_url) {
      hoverTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const isLocked = course.status === 'em_breve';
  const isCompleted = progress?.progress_percentage === 100;
  const hasProgress = progress && progress.progress_percentage > 0;

  const currentCover = course.cover_images?.[currentCoverIndex] || 
    course.cover_images?.[0];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:scale-105 hover:z-10 hover:shadow-2xl",
        size === "large" ? "h-80" : "h-64",
        isLocked && "opacity-70"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => !isLocked && onClick?.(course)}
    >
      {/* Cover Image */}
      <div className="relative w-full h-full">
        <img
          src={currentCover}
          alt={course.title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        
        {/* Video Trailer Overlay */}
        {course.trailer_url && isHovered && (
          <video
            ref={videoRef}
            src={course.trailer_url}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Status Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isLocked && (
            <Badge className="bg-gray-800/90 text-white backdrop-blur-sm">
              <Lock className="w-3 h-3 mr-1" />
              Em Breve
            </Badge>
          )}
          {isCompleted && !isLocked && (
            <Badge className="bg-green-600/90 text-white backdrop-blur-sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              Concluído
            </Badge>
          )}
          {course.category && (
            <Badge className="bg-black/60 text-white backdrop-blur-sm capitalize">
              {course.category}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg mb-1 line-clamp-2 group-hover:line-clamp-none transition-all">
            {course.title}
          </h3>
          
          {isHovered && (
            <p className="text-sm text-white/90 line-clamp-2 mb-2 animate-fade-in">
              {course.impact_narratives?.[0] || course.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-white/80">
            {course.total_duration_minutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(course.total_duration_minutes / 60)}h
              </span>
            )}
            {course.difficulty_level && (
              <span className="capitalize">{course.difficulty_level}</span>
            )}
          </div>

          {/* Progress Bar */}
          {showProgress && hasProgress && !isCompleted && (
            <div className="mt-3 space-y-1">
              <Progress 
                value={progress.progress_percentage} 
                className="h-1 bg-white/20" 
              />
              <span className="text-xs text-white/70">
                {Math.round(progress.progress_percentage)}% concluído
              </span>
            </div>
          )}
        </div>

        {/* Play Button on Hover */}
        {!isLocked && isHovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/50">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
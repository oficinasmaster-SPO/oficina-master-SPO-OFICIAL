import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HeroBanner({ featuredCourse, onPlay, onInfo }) {
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);
  const [currentNarrativeIndex, setCurrentNarrativeIndex] = useState(0);

  useEffect(() => {
    if (!featuredCourse) return;

    // Rotação de capas a cada 10 segundos
    const coverInterval = setInterval(() => {
      if (featuredCourse.cover_images?.length > 1) {
        setCurrentCoverIndex((prev) => 
          (prev + 1) % featuredCourse.cover_images.length
        );
      }
    }, 10000);

    // Rotação de narrativas a cada 8 segundos
    const narrativeInterval = setInterval(() => {
      if (featuredCourse.impact_narratives?.length > 1) {
        setCurrentNarrativeIndex((prev) => 
          (prev + 1) % featuredCourse.impact_narratives.length
        );
      }
    }, 8000);

    return () => {
      clearInterval(coverInterval);
      clearInterval(narrativeInterval);
    };
  }, [featuredCourse]);

  if (!featuredCourse) return null;

  const currentCover = featuredCourse.cover_images?.[currentCoverIndex] || 
    featuredCourse.cover_images?.[0];
  const currentNarrative = featuredCourse.impact_narratives?.[currentNarrativeIndex] || 
    featuredCourse.description;

  return (
    <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden bg-black">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <img
          src={currentCover}
          alt={featuredCourse.title}
          className="w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: 0.6 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-8 lg:px-16 max-w-7xl">
        <div className="max-w-2xl space-y-6">
          <Badge className="bg-red-600 text-white text-xs font-bold px-3 py-1">
            EM DESTAQUE
          </Badge>

          <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
            {featuredCourse.title}
          </h1>

          <p className="text-xl lg:text-2xl text-white/90 leading-relaxed animate-fade-in">
            {currentNarrative}
          </p>

          <div className="flex items-center gap-4 text-white/80 text-sm">
            {featuredCourse.category && (
              <Badge variant="outline" className="border-white/30 text-white">
                {featuredCourse.category}
              </Badge>
            )}
            {featuredCourse.total_duration_minutes > 0 && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {Math.floor(featuredCourse.total_duration_minutes / 60)}h {featuredCourse.total_duration_minutes % 60}min
              </span>
            )}
            {featuredCourse.difficulty_level && (
              <span className="capitalize">
                {featuredCourse.difficulty_level}
              </span>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              size="lg" 
              className="bg-white text-black hover:bg-white/90 font-semibold px-8 text-lg"
              onClick={() => onPlay?.(featuredCourse)}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              Assistir Agora
            </Button>
            <Button 
              size="lg"
              variant="outline" 
              className="border-white/50 text-white hover:bg-white/10 font-semibold px-8 text-lg"
              onClick={() => onInfo?.(featuredCourse)}
            >
              <Info className="w-5 h-5 mr-2" />
              Mais Informações
            </Button>
          </div>
        </div>
      </div>

      {/* Cover Indicators */}
      {featuredCourse.cover_images?.length > 1 && (
        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
          {featuredCourse.cover_images.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                index === currentCoverIndex 
                  ? "w-8 bg-white" 
                  : "w-4 bg-white/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
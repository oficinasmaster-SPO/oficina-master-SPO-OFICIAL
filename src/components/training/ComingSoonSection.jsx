import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ComingSoonSection({ courses, onRemindMe }) {
  const [reminded, setReminded] = useState(new Set());

  const handleRemindMe = async (course) => {
    try {
      await onRemindMe?.(course);
      setReminded((prev) => new Set([...prev, course.id]));
      toast.success("Você será notificado quando o curso for liberado!");
    } catch (error) {
      toast.error("Erro ao configurar lembrete");
    }
  };

  if (!courses || courses.length === 0) return null;

  return (
    <div className="py-8 px-8 lg:px-16">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-4xl">🔮</span>
          Em Breve
        </h2>
        <p className="text-white/70 mt-2">
          Novos cursos chegando em breve. Configure alertas para não perder!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const isReminded = reminded.has(course.id);
          const releaseDate = course.release_date 
            ? new Date(course.release_date) 
            : null;

          return (
            <div
              key={course.id}
              className="relative group overflow-hidden rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all"
            >
              {/* Blurred Background */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={course.cover_images?.[0]}
                  alt={course.title}
                  className="w-full h-full object-cover blur-sm scale-110"
                />
                <div className="absolute inset-0 bg-black/60" />
                
                {/* Lock Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border-2 border-white/30">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <Badge className="bg-yellow-500/90 text-black font-bold">
                      EM BREVE
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Trailer Preview */}
              {course.trailer_url && (
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/70"
                    onClick={() => window.open(course.trailer_url, '_blank')}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Trailer
                  </Button>
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-xl text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-white/70 line-clamp-3">
                    {course.impact_narratives?.[0] || course.description}
                  </p>
                </div>

                {releaseDate && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Liberação: {format(releaseDate, "d 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                )}

                <Button
                  className={cn(
                    "w-full",
                    isReminded 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                  onClick={() => handleRemindMe(course)}
                  disabled={isReminded}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {isReminded ? "Lembrete Ativado" : "Lembrar-me"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
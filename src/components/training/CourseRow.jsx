import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CourseCard from "./CourseCard";

export default function CourseRow({ 
  title, 
  subtitle, 
  courses, 
  progressMap = {},
  onCourseClick,
  showProgress = true 
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!courses || courses.length === 0) return null;

  return (
    <div className="relative group/row py-4">
      <div className="px-8 lg:px-16 mb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-sm text-white/70 mt-1">{subtitle}</p>
        )}
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20 h-32 w-12",
            "bg-black/50 hover:bg-black/70 text-white",
            "opacity-0 group-hover/row:opacity-100 transition-opacity",
            "rounded-r-md rounded-l-none"
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-8 lg:px-16 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {courses.map((course) => (
            <div key={course.id} className="flex-shrink-0 w-80">
              <CourseCard
                course={course}
                progress={progressMap[course.id]}
                onClick={onCourseClick}
                showProgress={showProgress}
              />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20 h-32 w-12",
            "bg-black/50 hover:bg-black/70 text-white",
            "opacity-0 group-hover/row:opacity-100 transition-opacity",
            "rounded-l-md rounded-r-none"
          )}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}
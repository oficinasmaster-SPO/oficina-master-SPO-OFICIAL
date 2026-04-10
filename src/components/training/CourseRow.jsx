import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ConsumeCourseCard from "./ConsumeCourseCard";

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
      <div className="px-4 lg:px-16 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-white/70 mt-1">{subtitle}</p>
        )}
      </div>

      <div className="relative">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 z-20 h-24 sm:h-32 w-8 sm:w-12",
            "bg-black/50 hover:bg-black/70 text-white hidden sm:flex",
            "opacity-0 group-hover/row:opacity-100 transition-opacity",
            "rounded-r-md rounded-l-none"
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </Button>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-16 scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {courses.map((course) => (
            <div key={course.id} className="flex-shrink-0 w-[240px] sm:w-[320px]">
              <ConsumeCourseCard
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
            "absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 z-20 h-24 sm:h-32 w-8 sm:w-12",
            "bg-black/50 hover:bg-black/70 text-white hidden sm:flex",
            "opacity-0 group-hover/row:opacity-100 transition-opacity",
            "rounded-l-md rounded-r-none"
          )}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </Button>
      </div>
    </div>
  );
}
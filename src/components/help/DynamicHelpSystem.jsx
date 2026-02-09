import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import HelpButton from "./HelpButton";
import GuidedTour from "./GuidedTour";

export default function DynamicHelpSystem({ pageName, autoStartTour = false }) {
  const { data: helpVideo } = useQuery({
    queryKey: ['help-video', pageName],
    queryFn: async () => {
      try {
        if (!pageName) return null;
        const videos = await base44.entities.HelpVideo.filter({ 
          page_name: pageName,
          enabled: true 
        });
        return videos?.[0] || null;
      } catch (error) {
        console.log('Error loading help video:', error);
        return null;
      }
    },
    enabled: !!pageName,
    retry: false
  });

  const { data: helpTour } = useQuery({
    queryKey: ['help-tour', pageName],
    queryFn: async () => {
      try {
        if (!pageName) return null;
        const tours = await base44.entities.HelpTour.filter({ 
          page_name: pageName,
          enabled: true 
        });
        return tours?.[0] || null;
      } catch (error) {
        console.log('Error loading help tour:', error);
        return null;
      }
    },
    enabled: !!pageName,
    retry: false
  });

  if (!pageName) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {helpVideo && helpVideo.title && (
        <HelpButton
          title={helpVideo.title}
          description={helpVideo.description || ""}
          videoUrl={helpVideo.video_url || ""}
          faqs={helpVideo.faqs || []}
          fullVideoUrl={helpVideo.full_video_url || ""}
        />
      )}
      
      {helpTour && helpTour.tour_id && helpTour.steps && helpTour.steps.length > 0 && (
        <GuidedTour
          tourId={helpTour.tour_id}
          steps={helpTour.steps}
          autoStart={autoStartTour}
        />
      )}
    </div>
  );
}
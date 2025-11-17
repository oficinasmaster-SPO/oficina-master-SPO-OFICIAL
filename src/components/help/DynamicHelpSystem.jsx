import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import HelpButton from "./HelpButton";
import GuidedTour from "./GuidedTour";

export default function DynamicHelpSystem({ pageName, autoStartTour = false }) {
  const { data: helpVideo } = useQuery({
    queryKey: ['help-video', pageName],
    queryFn: async () => {
      const videos = await base44.entities.HelpVideo.filter({ 
        page_name: pageName,
        enabled: true 
      });
      return videos?.[0] || null;
    },
    enabled: !!pageName
  });

  const { data: helpTour } = useQuery({
    queryKey: ['help-tour', pageName],
    queryFn: async () => {
      const tours = await base44.entities.HelpTour.filter({ 
        page_name: pageName,
        enabled: true 
      });
      return tours?.[0] || null;
    },
    enabled: !!pageName
  });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {helpVideo && (
        <HelpButton
          title={helpVideo.title || "Ajuda"}
          description={helpVideo.description || ""}
          videoUrl={helpVideo.video_url || ""}
          faqs={helpVideo.faqs || []}
          fullVideoUrl={helpVideo.full_video_url || ""}
        />
      )}
      
      {helpTour && helpTour.steps && helpTour.steps.length > 0 && (
        <GuidedTour
          tourId={helpTour.tour_id}
          steps={helpTour.steps}
          autoStart={autoStartTour}
        />
      )}
    </div>
  );
}
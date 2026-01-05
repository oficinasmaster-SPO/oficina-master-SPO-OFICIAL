import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InterviewReportViewer from "./InterviewReportViewer";

export default function InterviewReportDialog({ open, onClose, interview, candidate }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <InterviewReportViewer 
          interview={interview} 
          candidate={candidate}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
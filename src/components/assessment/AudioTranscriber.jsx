import React from "react";
import UnifiedAudioRecorder from "@/components/shared/UnifiedAudioRecorder";

export default function AudioTranscriber({ onTranscriptionComplete, placeholder = "Clique para gravar e transcrever..." }) {
  const handleTranscriptionComplete = (text) => {
    onTranscriptionComplete(text);
  };

  return (
    <UnifiedAudioRecorder
      showTranscription={true}
      onTranscriptionComplete={handleTranscriptionComplete}
    />
  );
}
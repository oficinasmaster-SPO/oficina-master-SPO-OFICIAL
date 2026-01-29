import React from "react";
import AudioCaptureField from "@/components/shared/AudioCaptureField";

/**
 * Wrapper para transcrição automática
 * Usado nas autoavaliações para gravar + transcrever automaticamente
 */
export default function AudioTranscriber({ onTranscriptionComplete, placeholder = "Clique para gravar e transcrever..." }) {
  const handleTranscribed = (text) => {
    if (onTranscriptionComplete && typeof onTranscriptionComplete === 'function') {
      onTranscriptionComplete(text);
    }
  };

  return (
    <AudioCaptureField
      mode="transcribe"
      onTranscribed={handleTranscribed}
      showManualTranscribe={false}
    />
  );
}
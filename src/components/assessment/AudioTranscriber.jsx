import React from "react";
import AudioCaptureField from "@/components/shared/AudioCaptureField";

/**
 * Wrapper para transcrição automática
 * Usado nas autoavaliações para gravar + transcrever automaticamente
 */
export default function AudioTranscriber({ onTranscriptionComplete, placeholder = "Clique para gravar e transcrever..." }) {
  return (
    <AudioCaptureField
      mode="transcribe"
      onTranscribed={(text) => onTranscriptionComplete(text)}
      showManualTranscribe={false}
    />
  );
}
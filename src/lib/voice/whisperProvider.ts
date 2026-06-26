// Stub for future Whisper API integration (server-side audio transcription).
// Currently unused — Web Speech API handles all voice capture in the browser.
import type { SpeechProvider, SpeechResultCallback, SpeechErrorCallback } from "./webSpeechProvider";

export class WhisperProvider implements SpeechProvider {
  isAvailable(): boolean {
    return false;
  }

  start(_onResult: SpeechResultCallback, onError: SpeechErrorCallback): void {
    onError("Whisper provider is not yet implemented");
  }

  stop(): void {}
}

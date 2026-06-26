export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export type SpeechResultCallback = (result: SpeechRecognitionResult) => void;
export type SpeechErrorCallback = (error: string) => void;

export interface SpeechProvider {
  isAvailable(): boolean;
  start(onResult: SpeechResultCallback, onError: SpeechErrorCallback): void;
  stop(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

function getSpeechRecognitionClass(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

class WebSpeechProvider implements SpeechProvider {
  private recognition: AnyRecognition = null;

  isAvailable(): boolean {
    return getSpeechRecognitionClass() !== null;
  }

  start(onResult: SpeechResultCallback, onError: SpeechErrorCallback): void {
    const API = getSpeechRecognitionClass();
    if (!API) {
      onError("このブラウザは音声認識に対応していません");
      return;
    }

    this.recognition = new API();
    this.recognition.lang = "ja-JP";
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      onResult({
        transcript: result[0].transcript as string,
        confidence: result[0].confidence as number,
        isFinal: result.isFinal as boolean,
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      onError(`音声認識エラー: ${event.error}`);
    };

    this.recognition.start();
  }

  stop(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.recognition?.stop();
    this.recognition = null;
  }
}

export const webSpeechProvider = new WebSpeechProvider();

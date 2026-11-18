"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API interface definitions for TypeScript (strict, zero any)
export interface ISpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

export interface ISpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: ISpeechRecognitionResultItem;
}

export interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: ISpeechRecognitionResult;
  };
}

export interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

export interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number; // in seconds
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const speechFinalTranscriptRef = useRef<string>("");

  // Check microphone support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasSpeech = !!(
        (window as unknown as IWindowSpeechRecognition).SpeechRecognition ||
        (window as unknown as IWindowSpeechRecognition).webkitSpeechRecognition
      );
      setIsSupported(hasMedia || hasSpeech);
    }
  }, []);

  // Cleanup helper to turn off mic hardware & timers
  const stopHardwareAndTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHardwareAndTimer();
    };
  }, [stopHardwareAndTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    setInterimTranscript("");
    speechFinalTranscriptRef.current = "";
    audioChunksRef.current = [];
    setDuration(0);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Determine supported mimeType for MediaRecorder
      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/wav")) {
          mimeType = "audio/wav";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200); // chunk every 200ms

      // Initialize browser SpeechRecognition for live interim feedback
      const win = window as unknown as IWindowSpeechRecognition;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: ISpeechRecognitionEvent) => {
            let interim = "";
            let final = "";
            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                final += res[0].transcript + " ";
              } else {
                interim += res[0].transcript;
              }
            }
            if (final) speechFinalTranscriptRef.current = final.trim();
            const currentCombined = (final + interim).trim();
            if (currentCombined) {
              setInterimTranscript(currentCombined);
            }
          };

          recognition.onerror = () => {
            // SpeechRecognition non-fatal error, MediaRecorder + Whisper will handle final transcription
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // Live preview is optional enhancement, safe to ignore
        }
      }

      setIsRecording(true);

      // Duration counter
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setDuration(secs);
      }, 500);
    } catch (err: unknown) {
      console.error("Microphone access error:", err);
      const isPermissionDenied =
        (err as { name?: string })?.name === "NotAllowedError" ||
        (err as { name?: string })?.name === "PermissionDeniedError";
      setError(
        isPermissionDenied
          ? "Microphone access was denied. Please allow microphone permissions in your browser settings."
          : "Unable to start microphone. Please check your audio input device."
      );
      stopHardwareAndTimer();
    }
  }, [stopHardwareAndTimer]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      stopHardwareAndTimer();
      setIsRecording(false);
      return null;
    }

    setIsRecording(false);
    setIsTranscribing(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    return new Promise<string | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        setIsTranscribing(false);
        stopHardwareAndTimer();
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        // Collect recorded blob
        const chunks = audioChunksRef.current;
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: mimeType });

        stopHardwareAndTimer();

        let finalResultText = "";

        // 1. Attempt Groq Whisper API transcription
        if (audioBlob.size > 500) {
          try {
            const formData = new FormData();
            formData.append("file", audioBlob, `voice-recording.${mimeType.includes("mp4") ? "mp4" : "webm"}`);

            const response = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text && typeof data.text === "string" && data.text.trim()) {
                finalResultText = data.text.trim();
              }
            }
          } catch (apiErr) {
            console.warn("Groq transcription API error, attempting fallback:", apiErr);
          }
        }

        // 2. Fallback to Web Speech transcript if Whisper was unavailable or empty
        if (!finalResultText) {
          const liveTranscript = (speechFinalTranscriptRef.current || interimTranscript).trim();
          if (liveTranscript) {
            finalResultText = liveTranscript;
          }
        }

        setIsTranscribing(false);
        setInterimTranscript("");
        speechFinalTranscriptRef.current = "";

        if (!finalResultText) {
          setError("No speech was detected. Please try speaking again.");
          resolve(null);
        } else {
          resolve(finalResultText);
        }
      };

      try {
        recorder.stop();
      } catch {
        setIsTranscribing(false);
        stopHardwareAndTimer();
        resolve(null);
      }
    });
  }, [isRecording, interimTranscript, stopHardwareAndTimer]);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    setIsTranscribing(false);
    setInterimTranscript("");
    speechFinalTranscriptRef.current = "";
    setError(null);
    setDuration(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    stopHardwareAndTimer();
  }, [stopHardwareAndTimer]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRecording,
    isTranscribing,
    duration,
    interimTranscript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  };
}

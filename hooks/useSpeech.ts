"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);

  // Stop any active speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    queueRef.current = [];
    setSpeaking(false);
  }, []);

  const speakWebAudio = useCallback((chunks: string[], lang: string) => {
    if (chunks.length === 0) {
      setSpeaking(false);
      return;
    }

    queueRef.current = [...chunks];
    setSpeaking(true);

    const playNext = () => {
      if (queueRef.current.length === 0) {
        setSpeaking(false);
        audioRef.current = null;
        return;
      }

      const nextChunk = queueRef.current.shift();
      if (!nextChunk || !nextChunk.trim()) {
        playNext();
        return;
      }

      const encoded = encodeURIComponent(nextChunk.trim());
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encoded}`;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = 0.95;

      audio.onended = () => {
        playNext();
      };

      audio.onerror = () => {
        playNext();
      };

      audio.play().catch(() => {
        setSpeaking(false);
      });
    };

    playNext();
  }, []);

  const speak = useCallback(
    (textToSpeak: string, isUrdu: boolean) => {
      if (typeof window === "undefined") return;

      stop();

      if (!textToSpeak.trim()) return;

      const hasSynthesis = "speechSynthesis" in window;
      const voices = hasSynthesis ? window.speechSynthesis.getVoices() : [];
      const urduVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("ur") ||
          v.name.toLowerCase().includes("urdu")
      );

      // On Windows and most desktop browsers, an authentic Urdu TTS engine is not installed.
      // Use high-fidelity web audio for Urdu if no local Urdu voice exists.
      if (isUrdu && !urduVoice) {
        const segments = textToSpeak
          .split(/(?<=[.۔!?\n])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        const chunks: string[] = [];
        for (const seg of segments) {
          if (seg.length <= 160) {
            chunks.push(seg);
          } else {
            const words = seg.split(" ");
            let current = "";
            for (const w of words) {
              if ((current + " " + w).length <= 160) {
                current = current ? current + " " + w : w;
              } else {
                if (current) chunks.push(current);
                current = w;
              }
            }
            if (current) chunks.push(current);
          }
        }

        speakWebAudio(chunks, "ur");
        return;
      }

      // Standard SpeechSynthesis for English or when Urdu voice is locally installed
      if (hasSynthesis) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = isUrdu ? "ur-PK" : "en-US";
        utterance.rate = 0.95;

        if (isUrdu && urduVoice) {
          utterance.voice = urduVoice;
        } else if (!isUrdu) {
          const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
          if (enVoice) utterance.voice = enVoice;
        }

        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    },
    [stop, speakWebAudio]
  );

  return { speaking, speak, stop };
}

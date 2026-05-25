"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { frequencyToMidi } from "@/lib/pitchUtils";

export interface PitchResult {
  frequency: number;
  midiNote: number;
  clarity: number; // 0.0 ~ 1.0
}

interface PitchDetectionOptions {
  onPitch: (result: PitchResult) => void;
  clarityThreshold?: number;
  amplitudeThreshold?: number; // RMS minimum (0.0~1.0)
}

export function usePitchDetection() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const optionsRef = useRef<PitchDetectionOptions | null>(null);
  const pitchyRef = useRef<typeof import("pitchy") | null>(null);

  const stop = useCallback(() => {
    setIsListening(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close();
      contextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const start = useCallback(async (opts: PitchDetectionOptions) => {
    setError(null);
    optionsRef.current = opts;
    const clarityThreshold = opts.clarityThreshold ?? 0.9;

    try {
      if (!pitchyRef.current) {
        pitchyRef.current = await import("pitchy");
      }
      const { PitchDetector } = pitchyRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      contextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.fftSize;
      bufferRef.current = new Float32Array(new ArrayBuffer(bufferLength * 4));

      const detector = PitchDetector.forFloat32Array(bufferLength);
      const amplitudeThreshold = opts.amplitudeThreshold ?? 0.015;

      setIsListening(true);

      const detect = () => {
        if (!analyserRef.current || !bufferRef.current) return;
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);

        // RMS amplitude gate — ignore quiet sounds (ambient noise, speaker bleed)
        let sum = 0;
        for (let i = 0; i < bufferRef.current.length; i++) {
          sum += bufferRef.current[i] * bufferRef.current[i];
        }
        const rms = Math.sqrt(sum / bufferRef.current.length);
        if (rms < amplitudeThreshold) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        const [frequency, clarity] = detector.findPitch(
          bufferRef.current,
          ctx.sampleRate
        );

        // Piano range: A1(55Hz)〜C7(2093Hz), clarity threshold for clean pitch
        if (clarity >= clarityThreshold && frequency >= 80 && frequency <= 2100) {
          const midiNote = frequencyToMidi(frequency);
          optionsRef.current?.onPitch({ frequency, midiNote, clarity });
        }

        rafRef.current = requestAnimationFrame(detect);
      };

      rafRef.current = requestAnimationFrame(detect);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "マイクへのアクセスに失敗しました";
      setError(msg);
      stop();
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, isListening, error };
}

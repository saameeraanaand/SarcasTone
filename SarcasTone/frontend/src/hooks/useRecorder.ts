import { useCallback, useRef, useState } from "react";
export function useRecorder() {
  const [recording, setRecording] = useState(false); const [level, setLevel] = useState(0); const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null); const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null); const raf = useRef(0); const timer = useRef<number>(0); const chunks = useRef<Blob[]>([]);
  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Microphone access is not supported in this browser (needs HTTPS or localhost)."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; setLevel(Math.min(1, Math.sqrt(s / buf.length) / 40)); raf.current = requestAnimationFrame(tick); };
      tick(); chunks.current = []; const mr = new MediaRecorder(stream); rec.current = mr;
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); cancelAnimationFrame(raf.current); setLevel(0);
        setBlob(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })); };
      mr.start(); setSeconds(0); setRecording(true); timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) { setError((e as Error).name === "NotAllowedError" ? "Microphone permission was denied." : "Could not start recording: " + (e as Error).message); }
  }, []);
  const stop = useCallback(() => { rec.current?.stop(); clearInterval(timer.current); setRecording(false); }, []);
  return { recording, level, seconds, blob, error, start, stop, reset: () => setBlob(null) };
}

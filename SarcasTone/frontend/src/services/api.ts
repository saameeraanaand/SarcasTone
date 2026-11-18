export interface Prediction { label: string; confidence: number; probabilities: Record<string, number> }
export interface Sentiment { compound: number; label: string; pos: number; neu: number; neg: number; method: string }
export interface Term { term: string; weight: number }
export interface TextResult { mode: "text"; model: string; prediction: Prediction; sentiment: Sentiment; top_terms: Term[]; explanation: string; model_cv_accuracy: number | null; processing_ms: number }
export interface AudioAnalysis {
  duration_s: number; waveform: number[]; pitch_t: number[]; pitch_hz: (number | null)[]; energy_t: number[]; energy: number[];
  mfcc: number[][]; pauses: { start: number; duration: number }[]; speaking_rate_syll_per_s: number;
  pitch_mean_hz: number; pitch_std_hz: number; pitch_range_hz: number; rms_mean: number; pause_ratio: number; n_pauses: number; voiced_ratio: number;
}
export interface AudioResult { mode: "audio" | "multimodal"; model: string | null; prediction: Prediction | null; sentiment: Sentiment | null; text_source: string | null;
  top_terms: Term[]; analysis: AudioAnalysis; explanation: string; model_available: boolean; model_cv_accuracy: number | null; processing_ms: number }
export interface ModelMetrics { model: string; input: string; n_samples: number; cv: string; accuracy: number; precision: number; recall: number; f1: number; roc_auc: number;
  confusion_matrix: number[][]; roc_curve: { fpr: number[]; tpr: number[] }; train_time_s_total_5folds: number; inference_time_ms_per_sample: number }
export interface MetricsResponse { dataset?: string; seed?: number; notes: string[]; models: Record<string, ModelMetrics> }
export interface Overview { source: string; total: number; sarcastic: number; non_sarcastic: number; missing_values: number; audio_available: number; n_speakers: number;
  by_show: { show: string; sarcastic: number; non_sarcastic: number }[]; top_speakers: Record<string, number>; avg_words: number }
export interface Sample { id: string; text: string; speaker: string; show: string; label: number; has_audio: boolean }

export class ApiError extends Error {}
async function handle<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `Request failed (${r.status})`;
    try { const j = await r.json(); msg = typeof j.detail === "string" ? j.detail : j.detail?.[0]?.msg ?? msg; } catch { /* ignore */ }
    throw new ApiError(msg);
  }
  return r.json();
}
const net = async <T,>(p: Promise<Response>) => { try { return handle<T>(await p); } catch (e) {
  if (e instanceof ApiError) throw e; throw new ApiError("Cannot reach the SarcasTone backend. Is it running on port 8000?"); } };

export const api = {
  health: () => net<{ status: string; models_loaded: string[]; audio_models_trained: boolean }>(fetch("/api/health")),
  text: (text: string) => net<TextResult>(fetch("/api/analyze/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })),
  audio: (file: Blob, name: string) => { const f = new FormData(); f.append("file", file, name); return net<AudioResult>(fetch("/api/analyze/audio", { method: "POST", body: f })); },
  multimodal: (file: Blob, name: string, text: string) => { const f = new FormData(); f.append("file", file, name); f.append("text", text); return net<AudioResult>(fetch("/api/analyze/multimodal", { method: "POST", body: f })); },
  metrics: () => net<MetricsResponse>(fetch("/api/models/metrics")),
  exploratory: () => net<{ setting: string; accuracy: number; f1: number }[]>(fetch("/api/models/exploratory")),
  overview: () => net<Overview>(fetch("/api/dataset/overview")),
  samples: (q: string, label: string, show: string, offset: number) => net<{ total: number; items: Sample[] }>(
    fetch(`/api/dataset/samples?q=${encodeURIComponent(q)}&label=${label}&show=${show}&limit=12&offset=${offset}`)),
};
